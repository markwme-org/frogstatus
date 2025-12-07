import { readFileSync } from 'fs';
import { join } from 'path';

export interface Dependency {
  name: string;
  version: string;
  status: 'ok' | 'vulnerable' | 'unknown';
  cves?: string[];
  severity?: string;
}

interface VulnerabilityInfo {
  cves: string[];
  description: string;
  severity: string;
}

interface VulnerabilityDatabase {
  [key: string]: VulnerabilityInfo;
}

function findRootDir(): string {
  const cwd = process.cwd();

  // If we're in a workspace directory (e.g., app-api), go up one level
  if (cwd.endsWith('app-api') || cwd.endsWith('app-ui')) {
    return join(cwd, '..');
  }

  return cwd;
}

function loadVulnerabilityDatabase(): VulnerabilityDatabase {
  try {
    const rootDir = findRootDir();
    const configPath = join(rootDir, 'scripts/dependency-states.json');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return config.vulnerabilityInfo || {};
  } catch {
    return {};
  }
}

function getPackageVersion(name: string, dependencies: Record<string, string>): string | null {
  const version = dependencies[name];
  if (!version) return null;

  // Remove ^ or ~ or other version prefixes
  return version.replace(/^[\^~>=<]/, '');
}

function checkVulnerability(
  name: string,
  version: string,
  vulnDb: VulnerabilityDatabase
): Pick<Dependency, 'status' | 'cves' | 'severity'> {
  const key = `${name}-${version}`;

  if (vulnDb[key]) {
    return {
      status: 'vulnerable',
      cves: vulnDb[key].cves,
      severity: vulnDb[key].severity,
    };
  }

  return { status: 'ok' };
}

export function getDependencies(): Dependency[] {
  const rootDir = findRootDir();
  const apiPackagePath = join(rootDir, 'app-api/package.json');
  const uiPackagePath = join(rootDir, 'app-ui/package.json');

  const apiPackage = JSON.parse(readFileSync(apiPackagePath, 'utf-8'));
  const uiPackage = JSON.parse(readFileSync(uiPackagePath, 'utf-8'));

  const vulnDb = loadVulnerabilityDatabase();

  const dependencies: Dependency[] = [];

  // Combine runtime dependencies from both workspaces
  const allDeps = {
    ...apiPackage.dependencies,
    ...uiPackage.dependencies,
  };

  // Key packages to highlight in the UI
  const highlightPackages = [
    'lodash',
    'axios',
    'jsonwebtoken',
    'node-forge',
    'express',
    'react',
  ];

  for (const pkgName of highlightPackages) {
    const version = getPackageVersion(pkgName, allDeps);

    if (version) {
      const vulnCheck = checkVulnerability(pkgName, version, vulnDb);

      dependencies.push({
        name: pkgName,
        version,
        ...vulnCheck,
      });
    }
  }

  return dependencies;
}
