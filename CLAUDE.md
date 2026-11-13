# FrogStatus — Claude Code Instructions

## After changing package.json dependencies

`package-lock.json` is tracked, because Frogbot's static SCA reads it. Without it, Frogbot sees only the project itself and reports no dependency vulnerabilities.

**Do not resolve packages on a laptop.** Locally the registry is transparently redirected to an internal Artifactory instance, which blocks the demo's deliberately vulnerable packages and bakes internal URLs into the lock file. Never run `npm install` or `npm install --package-lock-only` locally to regenerate the lock.

Instead, the lock files are generated on a clean GitHub runner and kept as canned copies in `scripts/locks/`:

| File | Used for |
|---|---|
| `scripts/locks/vulnerable.json` | the vulnerable state on `main` |
| `scripts/locks/clean.json` | the clean (fixed) state |
| `scripts/locks/vulnerable-express.json` | the demo PR branch (vulnerable state plus `express@4.17.1`) |

`npm run set-vulnerable:no-install` and `npm run set-clean:no-install` copy the matching file to `package-lock.json`, and `scripts/demo-create-pr.sh` does the same for the PR branch.

When you change dependency versions in `scripts/dependency-states.json` (or the PR's `express` version):

```bash
gh workflow run generate-locks.yml
gh run watch                                      # wait for it to finish
gh run download <run-id> -n demo-locks -D scripts/locks
```

If the PR's `express` version changes, update `EXPRESS_VERSION` in `scripts/generate-locks.mjs` and `scripts/demo-create-pr.sh` together.

Then commit the `scripts/locks/` files, `package.json` and `package-lock.json` together. Never commit `package.json` without the matching lock file.

### After fixing vulnerabilities live (for example through the JFrog MCP server)

When dependency versions in `package.json` change outside the canned states, refresh the lock from whatever `package.json` currently says:

```bash
./scripts/refresh-lock.sh        # resolves on a runner, writes package-lock.json
git add package.json package-lock.json
```

Do not hand-edit `package-lock.json` or run `npm install` locally. If the lock is stale, Frogbot's static SCA keeps reporting the old vulnerable versions even though CI (which reinstalls through Artifactory) builds clean.
