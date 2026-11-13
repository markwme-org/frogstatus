#!/usr/bin/env node
// Generates the canned demo lock files in scripts/locks/ (or the directory given as
// the first argument).
//
// This RESOLVES packages against the public registry, so run it only where that is
// acceptable: the generate-locks GitHub Actions workflow, which runs on a clean
// runner. Do not run it on a laptop where the registry is transparently redirected
// to an internal Artifactory instance.
//
// It uses `npm install --package-lock-only`, which reads package metadata only.
// Nothing is installed and no install scripts run.
//
// Variants:
//   vulnerable          dependencies from the "vulnerable" state
//   clean               dependencies from the "clean" state
//   vulnerable-express  "vulnerable" plus express 4.17.1 (the demo PR state)

import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, rmSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';

const REGISTRY = 'https://registry.npmjs.org';
const ALLOWED_HOST = 'registry.npmjs.org';
const EXPRESS_VERSION = '4.17.1';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, '..');
const outDir = resolve(process.argv[2] || join(scriptDir, 'locks'));

const states = JSON.parse(readFileSync(join(scriptDir, 'dependency-states.json'), 'utf-8'));
const basePkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));

const variants = {
  vulnerable: { ...states.vulnerable.dependencies },
  clean: { ...states.clean.dependencies },
  'vulnerable-express': { ...states.vulnerable.dependencies, express: EXPRESS_VERSION },
};

function checkResolvedHosts(lockPath, name) {
  const lock = JSON.parse(readFileSync(lockPath, 'utf-8'));
  const bad = [];
  let count = 0;
  for (const [key, entry] of Object.entries(lock.packages || {})) {
    if (!key || !entry.resolved) continue;
    count++;
    const host = new URL(entry.resolved).host;
    if (host !== ALLOWED_HOST) bad.push(`${key} -> ${entry.resolved}`);
  }
  if (bad.length > 0) {
    throw new Error(`${name}: ${bad.length} resolved URL(s) point away from ${ALLOWED_HOST}:\n  ${bad.join('\n  ')}`);
  }
  return count;
}

mkdirSync(outDir, { recursive: true });

for (const [name, dependencies] of Object.entries(variants)) {
  const work = mkdtempSync(join(tmpdir(), `lock-${name}-`));
  try {
    const pkg = { ...basePkg, dependencies };
    writeFileSync(join(work, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

    console.log(`\n▶ ${name}: resolving ${Object.keys(dependencies).length} direct dependencies`);
    execFileSync(
      'npm',
      ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund', '--registry', REGISTRY],
      { cwd: work, stdio: 'inherit' },
    );

    const lockPath = join(work, 'package-lock.json');
    const count = checkResolvedHosts(lockPath, name);
    copyFileSync(lockPath, join(outDir, `${name}.json`));
    console.log(`✓ ${name}: ${count} packages, all resolved from ${ALLOWED_HOST}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

console.log(`\nWrote lock files to ${outDir}`);
