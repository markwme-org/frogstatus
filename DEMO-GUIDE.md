# FrogStatus Demo Guide

A repeatable, scripted demo covering JFrog's software supply chain security story:
Curation → Local tooling → CI gate → MCP/AI-assisted fixes → Frogbot PR scanning.

---

## Prerequisites

**JFrog setup:**
- Artifactory with an npm remote repository proxying npmjs.org
- Xray enabled with a Watch covering your npm builds
- Curation policies enabled (CVSS high/critical block + malicious package block)
- CVS (Compliant Version Selection) enabled
- Frogbot installed on this repository
- JFrog MCP server configured in your IDE (for MCP step)

**Local setup:**
- JFrog CLI authenticated (`jf c show`)
- JFrog VS Code extension installed and connected
- `JF_NPM_REPOSITORY` env var set to your npm repository name
- GitHub CLI authenticated (`gh auth status`)

**One-time setup (if node_modules are missing):**
```bash
npm run set-clean:no-install
rm -rf node_modules app-api/node_modules app-ui/node_modules package-lock.json
jf npm install
```

---

## Before the Audience Arrives

Run the setup script to put the repo into a known failing state:

```bash
./scripts/demo-setup.sh
```

This switches to vulnerable dependencies, cleans up any leftover demo PRs, commits, and pushes — triggering a CI run that will fail. Wait for it to fail before starting.

To reset after the demo:
```bash
./scripts/demo-cleanup-pr.sh   # close Frogbot PR and delete branch
npm run set-clean:no-install   # flip package.json back to clean
```

---

## Demo Flow

### 1. CI Gate — The Build Failed

**What to show:** GitHub Actions → the failing build → JFrog Job Summary tab.

Open the failed CI run. Click the **JFrog Job Summary** tab.

The summary shows two things:
- **Curation blocks**: packages that were blocked during `npm install`
- **Xray violations**: policy violations from the build scan

Point out the axios block specifically:
> "axios 0.21.1 is a hard block — CRITICAL CVE 9.8, no waiver available. The build never even got past the install step for this one."

For the other packages (node-forge, jsonwebtoken, @hono/node-server, lodash):
> "These are High severity. Policy allows waivers — a security team can approve an exception while a fix is being prepared."

**Talking point:** The CI gate catches this before any artifact is promoted. Nothing reaches staging with these dependencies.

---

### 2. Local Developer View — IDE Extension

Switch to VS Code with the project open.

The JFrog extension highlights vulnerable packages inline in `package.json`. Hover over a flagged dependency to show CVE details, severity, and the recommended fix version.

**Talking point:** "Developers get this feedback in their normal workflow without switching tools. Shift left — catch it before it's ever committed."

---

### 3. Local Developer View — Curation Audit

```bash
jf curation-audit
```

This shows the same 5 blocked packages the CI saw, but locally — before any push. Each entry includes:
- The CVEs and CVSS scores
- Whether a waiver is available
- The recommended fix version

**Talking point:**
> "A developer can run this in 30 seconds and know exactly what's blocked and why. No waiting for CI."

Point out the distinction between hard blocks and waiverable blocks:
- `axios@0.21.1` → hard block, must upgrade
- `node-forge`, `jsonwebtoken`, `lodash`, `@hono/node-server` → waiver available

On CVS (mention, don't demo live):
> "CVS — Compliant Version Selection — takes this further. Instead of blocking the install, it transparently filters blocked versions from the package index. If you have a range like `^7.0.0`, CVS removes the blocked versions before npm ever sees them. Your build stays green, you automatically get the compliant version. We saw this with undici recently — 12+ consecutive releases were blocked for Critical CVEs. Teams with CVS never had a failing build."

---

### 4. Local Developer View — Full Audit

```bash
jf audit --working-dirs '.'
```

This goes beyond curation to show the full Xray picture: all CVEs across the dependency tree, including transitive dependencies, with CVSS scores and fix versions.

**Talking point:** "Curation audit is your pre-emptive gate. Xray audit is your full-spectrum view — it catches issues in transitive dependencies your direct deps pull in."

---

### 5. AI-Assisted Fix — MCP + Copilot

With the JFrog MCP server configured in your IDE, open GitHub Copilot chat and ask:

> "What's the safe version of axios I should upgrade to?"
> "Are there any curation-blocked packages in this project?"

The MCP server connects Copilot directly to JFrog Catalog data, returning CVS recommendations and policy information in context.

**Talking point:** "Developers don't have to leave their IDE or know which JFrog screen to look at. The AI assistant has direct access to the same data driving your policies."

---

### 6. Frogbot — PR Scanning

Create the demo PR:

```bash
./scripts/demo-create-pr.sh
```

This opens a PR from a branch that includes a vulnerable lodash version. Navigate to the PR on GitHub.

Frogbot will automatically comment on the PR with:
- A summary of vulnerabilities found
- CVE details and severity
- Recommended fix versions
- Links to JFrog Catalog for each finding

**Talking point:** "Every PR gets an automated security review. No manual intervention, no waiting for a security team. The developer sees exactly what needs fixing before the code is ever merged."

---

### 7. Fix It — Green Build

Switch to clean dependencies and push:

```bash
npm run set-clean:no-install
rm -rf node_modules app-api/node_modules app-ui/node_modules package-lock.json
jf npm install
git add package.json package-lock.json app-api/package.json app-ui/package.json
git commit -m "fix: upgrade dependencies to resolve CVEs"
git push
```

Wait for CI. Show the green build and the clean JFrog Job Summary — no curation blocks, no Xray violations.

**Talking point:** "Same pipeline, same policies. Now everything passes. The Job Summary confirms it — clean install, clean scan, artifact promoted."

---

## Vulnerable Packages (for reference)

| Package | Version | Severity | Block type | Fix version |
|---|---|---|---|---|
| axios | 0.21.1 | Critical 9.8 | Hard block, no waiver | 1.7.8 |
| node-forge | 0.10.0 | High (up to 8.6) | Waiver available | 1.4.0 |
| jsonwebtoken | 8.5.1 | High (up to 8.1) | Waiver available | 9.0.0 |
| lodash | 4.17.19 | High 7.2 | Waiver available | 4.17.21 |
| @hono/node-server | 1.19.7 | High 7.5 | Waiver available | 1.19.10 |

---

## Key Commands

```bash
# State switching (safe to run with no node_modules)
npm run set-vulnerable:no-install
npm run set-clean:no-install

# Install through JFrog (CVS + curation active)
jf npm install

# Scanning
jf curation-audit
jf audit --working-dirs '.'

# Demo scripts
./scripts/demo-setup.sh          # pre-demo: flip to vulnerable + push
./scripts/demo-create-pr.sh      # Frogbot demo: create vulnerable PR
./scripts/demo-cleanup-pr.sh     # post-demo: close PR, delete branch
```

---

## What CVS Does (Conceptual)

CVS filters the npm package **index** — not the download. When a package version is blocked by curation policy, CVS removes it from the list of available versions before npm resolves. So if you request `^7.0.0` and versions `7.15.0–7.24.x` are all blocked:

- **Without CVS**: npm resolves to `7.24.6`, curation blocks the download, build fails
- **With CVS**: npm's index only shows versions up to `7.14.0`, resolves cleanly, build succeeds

CVS only works with version ranges (not pinned versions). It requires CVS to be enabled on the repository — there is no code change required.

---

## Troubleshooting

**State switcher fails (tsx not found):**
Use the `:no-install` variants — they use `node` directly: `npm run set-clean:no-install`

**`jf npm install` blocks everything (vulnerable state):**
That's correct — this is the demo. Use `jf curation-audit` against the lock file instead of trying to install the vulnerable state through JFrog.

**Frogbot doesn't comment on the PR:**
Check that the Frogbot GitHub App is installed and the `frogbot.yml` workflow is present. Frogbot runs on a schedule or on PR events depending on config — it may take a few minutes.

**JFrog Job Summary not appearing:**
The summary is generated by the `setup-jfrog-cli` post-step. It only appears if the `jfrog/setup-jfrog-cli@v5` action ran. Check the workflow uses `.github/actions/setup-jfrog-cli`.
