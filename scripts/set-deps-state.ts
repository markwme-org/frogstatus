#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

interface DependencyState {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface StateConfig {
  vulnerable: {
    'app-api': DependencyState;
    'app-ui': DependencyState;
  };
  clean: {
    'app-api': DependencyState;
    'app-ui': DependencyState;
  };
}

function loadStateConfig(): StateConfig {
  const configPath = join(__dirname, 'dependency-states.json');
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

function updatePackageJson(workspace: string, state: DependencyState) {
  const packagePath = join(rootDir, workspace, 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));

  pkg.dependencies = state.dependencies;
  pkg.devDependencies = state.devDependencies;

  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ Updated ${workspace}/package.json`);
}

function main() {
  const args = process.argv.slice(2);
  const targetState = args[0] as 'vulnerable' | 'clean';

  if (!targetState || !['vulnerable', 'clean'].includes(targetState)) {
    console.error('Usage: npm run set-deps-state <vulnerable|clean>');
    process.exit(1);
  }

  console.log(`\n🐸 FrogStatus Dependency State Switcher`);
  console.log(`Setting to: ${targetState}\n`);

  const config = loadStateConfig();
  const stateConfig = config[targetState];

  console.log('Updating package.json files...');
  updatePackageJson('app-api', stateConfig['app-api']);
  updatePackageJson('app-ui', stateConfig['app-ui']);

  console.log('\nReinstalling dependencies...');
  console.log('This may take a moment...\n');

  try {
    // Remove existing node_modules and lock file for clean install
    execSync('rm -rf node_modules package-lock.json app-api/node_modules app-ui/node_modules', {
      cwd: rootDir,
      stdio: 'inherit',
    });

    execSync('npm install', {
      cwd: rootDir,
      stdio: 'inherit',
    });

    console.log(`\n✅ Successfully switched to ${targetState} state!`);

    if (targetState === 'vulnerable') {
      console.log('\n⚠️  WARNING: Application is now using VULNERABLE dependencies!');
      console.log('Known vulnerabilities in this state:');
      console.log('  - lodash 4.17.19: CVE-2020-8203 (Prototype pollution)');
      console.log('  - axios 0.21.1: CVE-2021-3749 (SSRF)');
      console.log('  - jsonwebtoken 8.5.1: Multiple CVEs (JWT bypass)');
      console.log('  - node-forge 0.10.0: Multiple CVEs (Crypto issues)');
      console.log('  - express 4.17.1: CVE-2022-24999 (Open redirect)');
      console.log('\n💡 Run JFrog IDE scanner to see these vulnerabilities detected.');
    } else {
      console.log('\n✅ Application is now using CLEAN dependencies.');
      console.log('All known CVEs have been addressed.');
    }

    console.log('\nNext steps:');
    console.log('  1. Run tests: npm test');
    console.log('  2. Scan with JFrog IDE tools');
    console.log('  3. Start dev server: npm run dev\n');

  } catch (error) {
    console.error('\n❌ Error during dependency installation:', error);
    process.exit(1);
  }
}

main();
