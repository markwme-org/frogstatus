#!/usr/bin/env node
// Generates batched JFrog AQL spec files from package-lock.json so that
// `jf rt build-add-dependencies --from-rt --spec <file>` can add all
// npm dependencies to the build-info.
//
// Artifactory limits AQL queries to 6000 chars, so packages are split into
// batches. Each batch is written as a separate numbered spec file.
//
// Usage:
//   node scripts/gen-build-deps-spec.js <npm-remote-repo> <output-dir>
//
// Outputs:
//   <output-dir>/deps-spec-001.json, deps-spec-002.json, ...
//
// Example:
//   node scripts/gen-build-deps-spec.js fs-npm-remote-cache /tmp/deps

const fs = require('fs');
const path = require('path');

const [,, npmRepo, outputDir] = process.argv;

if (!npmRepo || !outputDir) {
  console.error('Usage: gen-build-deps-spec.js <npm-remote-repo> <output-dir>');
  process.exit(1);
}

const lockfilePath = path.join(__dirname, '..', 'package-lock.json');
const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));

const npmOrgBase = 'https://registry.npmjs.org/';
const names = new Set();

for (const [, pkg] of Object.entries(lockfile.packages || {})) {
  if (pkg.resolved && pkg.resolved.startsWith(npmOrgBase)) {
    // Extract just the filename: "picomatch/-/picomatch-2.3.1.tgz" -> "picomatch-2.3.1.tgz"
    const filename = pkg.resolved.slice(npmOrgBase.length).split('/').pop();
    names.add(filename);
  }
}

if (names.size === 0) {
  console.error('No resolved npm packages found in package-lock.json');
  process.exit(1);
}

// AQL $or syntax requires repo inside each condition:
//   {"$or": [{"repo": "...", "name": "a.tgz"}, ...]}
// Each condition is ~repo(20) + name(~25) + overhead = ~65 chars.
// At 75 per batch: ~4900 chars, safely under the 6000 char limit.
const BATCH_SIZE = 75;
const allNames = [...names];
const batches = [];
for (let i = 0; i < allNames.length; i += BATCH_SIZE) {
  batches.push(allNames.slice(i, i + BATCH_SIZE));
}

fs.mkdirSync(outputDir, { recursive: true });

for (let i = 0; i < batches.length; i++) {
  const conditions = batches[i].map(name => ({ repo: npmRepo, name }));
  const spec = {
    files: [{
      aql: {
        "items.find": { "$or": conditions }
      }
    }]
  };
  const filename = path.join(outputDir, `deps-spec-${String(i + 1).padStart(3, '0')}.json`);
  fs.writeFileSync(filename, JSON.stringify(spec));
}

console.log(`${names.size} packages → ${batches.length} spec files in ${outputDir}`);
