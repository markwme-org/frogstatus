# Demo Script: "Secure by Default — A Developer's Story"

## Narrative Arc

CI failure → Job Summary walkthrough → Local IDE/CLI tools →
MCP-assisted fix → Frogbot PR → Clean build

Opening with a broken build creates immediate stakes. The rest of the demo answers
how JFrog helps you find problems earlier, and how it catches things automatically
in PRs. The story ends with a green build.

---

## Pre-Demo Setup Checklist

Before the audience arrives:

1. Run the setup script — this switches to vulnerable state, cleans up any leftover
   demo PRs, commits and pushes to trigger a failing CI run:
   ```bash
   ./scripts/demo-setup.sh
   ```
2. Wait for the CI run to fail — have the GitHub Actions URL ready to paste/open
3. VS Code is open with the JFrog extension connected and the repo loaded
4. A Copilot chat window is open in VS Code
5. Confirm Frogbot is active: check a previous PR comment exists or the app is installed

---

## Act 1 — The Problem (CI, ~3 min)

**Spoken narrative:** *"My team uses JFrog as our artifact registry and security
gate. I pushed some changes this morning and my CI build failed. Let's look at why."*

1. Open the failed GitHub Actions run
2. Click the **JFrog Job Summary** tab
3. Walk through the two sections:

   **Curation Audit**
   > "Curation is the first line of defence — it sits at the registry level.
   > These packages were blocked before they even downloaded. The build couldn't
   > start because our policy says these versions aren't allowed in."

   Point out the axios entry:
   > "This one is a hard block — Critical CVE, CVSS 9.8, no waiver available.
   > It has to be upgraded. The others — node-forge, jsonwebtoken, lodash,
   > @hono/node-server — are High severity. Policy allows a waiver for those,
   > so a security team can approve a temporary exception while a fix is prepared."

   **Xray Security Violations and Issues**
   > "These come from the Xray build scan — packages that did install successfully
   > but violate our security policy. Xray scanned the full build and surfaced
   > these across direct and transitive dependencies."

**Transition:** *"The build failed before my app even compiled. But I shouldn't
have to wait for CI to find this — let me show you what I should have caught
earlier."*

---

## Act 2 — Local Detection (~4 min)

### 2a. IDE Extension

*"The JFrog VS Code extension scans my workspace in real time."*

4. Show the JFrog extension panel — vulnerable packages highlighted in `package.json`
5. Click a highlighted package to show the CVE detail, severity, and fix version
6. Point out:
   > "I can see this before I write a single line of code, let alone push. The
   > feedback is right here in my editor — no context switching, no waiting
   > for a pipeline."

### 2b. CLI — Curation Audit

*"I can also check curation status directly from the terminal."*

```bash
jf curation-audit
```

Walk through the output:

> "Each blocked package shows the CVE, the CVSS score, and critically — the
> version I should upgrade to. axios 0.21.1 is a hard block: this specific
> version is not coming through our registry. Upgrade to 1.7.8 and it passes.
> The others are waiverable — a risk decision for the security team, but JFrog
> tells me the fix version either way."

Mention CVS briefly:

> "If these had been version ranges instead of pinned versions, CVS —
> Compliant Version Selection — would have handled this transparently.
> JFrog filters the blocked versions from the package index before npm
> resolves them. You'd get the compliant version automatically, build stays
> green. It's the invisible safety net for teams who use ranges."

### 2c. CLI — Full Audit

```bash
jf audit --working-dirs "."
```

> "This goes deeper — full CVE coverage across direct and transitive
> dependencies, the same data driving our Xray policies. Good for seeing
> the full blast radius before deciding what to fix first."

---

## Act 3 — Fix with MCP + Copilot (~4 min)

*"Now I know what's broken. I could fix it manually, but I have the JFrog MCP
server connected to GitHub Copilot. Let me use it to guide the fix."*

In the Copilot Chat panel, use these exact prompts:

**Prompt 1:**
```
Is axios 0.21.1 safe to use according to JFrog? What's the recommended
compliant version I should upgrade to?
```

Copilot calls `get_curation_package_status` via the MCP server and returns
the policy status and recommended version.

**Prompt 2:**
```
Are there any other packages in this project blocked by JFrog curation?
Check package.json and suggest the compliant versions for each.
```

Copilot calls `list_catalog_package_versions` for each flagged package and
returns a full set of recommendations.

**Prompt 3:**
```
Update package.json with those compliant versions.
```

Apply the changes, then verify:

```bash
jf curation-audit   # should show no blocked packages
```

**Key talking point:**
> "I didn't need to know the JFrog API or which screen to look at.
> Copilot used the MCP server to query the catalog directly. The fix is
> grounded in real policy data, not a guess."

---

## Act 4 — Frogbot PR (~4 min)

*"Now let me show you what happens when a colleague introduces a vulnerability
in a pull request — without even knowing about it."*

```bash
./scripts/demo-create-pr.sh
```

This creates a branch with a known-vulnerable dependency and opens a PR.

Go to the **Actions tab** and find the pending Frogbot workflow run. Click
**Review deployments**, check the box, and approve. Use this moment:

> "Frogbot requires a trusted reviewer to approve the scan before it runs —
> this prevents a malicious PR from using Frogbot to probe your JFrog credentials."

Frogbot will comment within a minute or two of approval.
The workflow run itself will show as **failed** — that's intentional and worth pointing out:

> "The Frogbot job is marked as failed — that's the enforcement signal. This PR
> can't be silently merged while these vulnerabilities are present. But the real
> output is here on the PR itself..."

Walk through the Frogbot comment:

> "Frogbot scanned the PR and flagged the vulnerable package — CVE details,
> severity, fix version, all inline on the PR. My colleague didn't need to
> know anything about JFrog. The review process caught it automatically,
> the same way a linter catches a syntax error."

> "Frogbot can also open an automatic fix PR — it updates the dependency
> and opens a new PR for review. One click and the vulnerability is addressed."

Clean up after the demo:
```bash
./scripts/demo-cleanup-pr.sh
```

---

## Act 5 — The Green Build (~2 min)

*"After applying the fixes, let me show you what a clean build looks like."*

If you applied fixes live in Act 3, commit and push those changes:
```bash
git add package.json
git commit -m "fix: upgrade dependencies to compliant versions"
git push
```

If resetting to clean state instead of using the live MCP fixes:
```bash
npm run set-clean:no-install
git add package.json
git commit -m "fix: upgrade dependencies to compliant versions"
git push
```

Switch to GitHub Actions. Show the green build and the clean Job Summary:

> "Same pipeline, same policies — now everything passes. Curation audit
> shows no blocks. Xray violations: zero. The artifact is clean and
> ready to promote."

---

## Timing Summary

| Act | Content | Time |
|-----|---------|------|
| 1 | CI failure + Job Summary | ~3 min |
| 2 | IDE + curation-audit + audit | ~4 min |
| 3 | MCP + Copilot fix | ~4 min |
| 4 | Frogbot PR | ~4 min |
| 5 | Green build | ~2 min |
| **Total** | | **~17 min** |

---

## If Things Go Wrong

**CI hasn't failed yet:** Walk through the Job Summary from a previous failed
run — it persists. Have the URL bookmarked.

**Frogbot takes too long:** Show a screenshot of a previous Frogbot comment
while waiting. Frogbot comments persist on old PRs — have one ready as backup.

**MCP prompts don't return useful data:** Fall back to `jf curation-audit`
output and narrate what you'd normally ask Copilot. The data is the same.

**`jf npm install` is blocked (vulnerable state):** Expected — that's the demo.
Don't try to install the vulnerable state through JFrog. Use `jf curation-audit`
against the existing lock file instead.
