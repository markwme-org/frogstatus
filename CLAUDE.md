# FrogStatus — Claude Code Instructions

## After changing package.json dependencies

Always regenerate the lock file immediately after modifying any dependency version in `package.json`:

```bash
npm install --package-lock-only --registry https://registry.npmjs.org
```

Then commit **both** `package.json` and `package-lock.json` together. Never commit one without the other.

The CI pipeline runs a curation audit and Xray audit against the lock file before installing, so a stale lock file will cause the build to fail with vulnerabilities that appear already fixed.
