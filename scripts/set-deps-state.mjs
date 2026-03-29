#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function loadStateConfig() {
  const configPath = join(__dirname, 'dependency-states.json');
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

function updatePackageJson(workspace, state) {
  const packagePath = join(rootDir, workspace, 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));

  pkg.dependencies = state.dependencies;
  pkg.devDependencies = state.devDependencies;

  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ Updated ${workspace}/package.json`);
}

function printStateInfo(targetState) {
  if (targetState === 'vulnerable') {
    console.log('\n⚠️  WARNING: Application is now using VULNERABLE dependencies!');
    console.log('\nCuration blocks (jf curation-audit):');
    console.log('  - axios 0.21.1:            CRITICAL 9.8 + High CVEs — hard block, no waiver  → CVS: 1.7.8');
    console.log('  - node-forge 0.10.0:       High CVEs (up to 8.6)    — waiver available       → CVS: 1.4.0');
    console.log('  - jsonwebtoken 8.5.1:      High CVEs (up to 8.1)    — waiver available       → CVS: 9.0.0');
    console.log('  - @hono/node-server 1.19.7 High CVE 7.5             — waiver available       → CVS: 1.19.10');
    console.log('\n💡 Check curation: jf curation-audit');
    console.log('💡 IDE: Open VS Code with JFrog extension to see inline highlighting.');
  } else {
    console.log('\n✅ Application is now using CLEAN dependencies.');
    console.log('All known CVEs have been addressed.');
  }

  console.log('\nNext steps:');
  console.log('  1. Run tests: npm test');
  console.log('  2. Scan with JFrog IDE tools');
  console.log('  3. Start dev server: npm run dev\n');
}

function main() {
  const args = process.argv.slice(2);
  const targetState = args[0];
  const skipInstall = args.includes('--no-install');

  if (!targetState || !['vulnerable', 'clean'].includes(targetState)) {
    console.error('Usage: node scripts/set-deps-state.mjs <vulnerable|clean> [--no-install]');
    process.exit(1);
  }

  console.log(`\n🐸 FrogStatus Dependency State Switcher`);
  console.log(`Setting to: ${targetState}\n`);

  const config = loadStateConfig();
  const stateConfig = config[targetState];

  console.log('Updating package.json files...');
  updatePackageJson('app-api', stateConfig['app-api']);
  updatePackageJson('app-ui', stateConfig['app-ui']);

  if (stateConfig.overrides) {
    const rootPkgPath = join(rootDir, 'package.json');
    const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
    rootPkg.overrides = { ...rootPkg.overrides, ...stateConfig.overrides };
    writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
    console.log('✓ Updated root package.json overrides');
  }

  if (skipInstall) {
    console.log('\n⏭️  Skipping install (--no-install). Run manually:');
    console.log('  rm -rf node_modules app-api/node_modules app-ui/node_modules package-lock.json');
    console.log('  jf npm install\n');
    printStateInfo(targetState);
    return;
  }

  console.log('\nReinstalling dependencies...');
  console.log('This may take a moment...\n');

  try {
    execSync('rm -rf node_modules package-lock.json app-api/node_modules app-ui/node_modules', {
      cwd: rootDir,
      stdio: 'inherit',
    });

    execSync('npm install', {
      cwd: rootDir,
      stdio: 'inherit',
    });

    console.log(`\n✅ Successfully switched to ${targetState} state!`);
    printStateInfo(targetState);

  } catch (error) {
    console.error('\n❌ Error during dependency installation:', error);
    process.exit(1);
  }
}

main();
