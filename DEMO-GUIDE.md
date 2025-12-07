# FrogStatus Demo Guide

This guide walks through using FrogStatus to demonstrate JFrog's security and DevSecOps capabilities.

## Table of Contents

1. [Demo Overview](#demo-overview)
2. [Prerequisites](#prerequisites)
3. [Demo Flow](#demo-flow)
4. [FrogBot Integration Points](#frogbot-integration-points)
5. [Vulnerability Details](#vulnerability-details)
6. [Talking Points](#talking-points)

---

## Demo Overview

FrogStatus is designed to showcase JFrog's integrated security platform including:

- **JFrog Xray**: Vulnerability scanning and policy enforcement
- **JFrog Artifactory**: Build info and artifact tracking
- **JFrog Curation**: Package curation and approval workflows
- **IDE Integration**: Real-time security feedback during development
- **FrogBot**: Automated pull request scanning and fix suggestions
- **CI/CD Integration**: Build-time security gates

---

## Prerequisites

### Required JFrog Setup

1. **JFrog Platform Access**
   - Artifactory instance
   - Xray enabled
   - Curation policies configured (optional)

2. **JFrog IDE Plugin**
   - Install for your IDE (VS Code, IntelliJ, etc.)
   - Configure with your JFrog platform URL and credentials

3. **GitHub Repository**
   - Fork or clone FrogStatus to your GitHub account
   - Configure GitHub Actions secrets:
     - `JF_URL`: Your JFrog platform URL
     - `JF_ACCESS_TOKEN`: JFrog access token with appropriate permissions

4. **FrogBot (Optional)**
   - Install FrogBot GitHub App on your repository
   - Configure FrogBot scanning policies

### Local Development Setup

```bash
# Clone the repository
git clone <your-fork-url>
cd frogstatus

# Start in CLEAN state
npm install
npm run set-clean

# Verify setup
npm test
npm run build
```

---

## Demo Flow

### Phase 1: Development with Vulnerabilities

**Objective**: Show how vulnerabilities are detected during local development

1. **Switch to vulnerable state**
   ```bash
   npm run set-vulnerable
   ```

2. **Open the project in your IDE**
   - The JFrog IDE plugin will automatically scan
   - Demonstrate the security issues it finds:
     - Dependency vulnerabilities (CVEs)
     - SAST issues in code
     - Hardcoded secrets
     - Insecure coding patterns

3. **Show vulnerable dependencies in UI**
   ```bash
   npm run dev
   ```
   - Open http://localhost:3000
   - Point out the Dependency Health panel showing vulnerabilities
   - Show CVE details, severity badges
   - Explain the vulnerable packages:
     - `lodash 4.17.19` - Prototype pollution
     - `axios 0.21.1` - SSRF vulnerability
     - `jsonwebtoken 8.5.1` - JWT bypass vulnerabilities
     - `node-forge 0.10.0` - Cryptographic vulnerabilities
     - `express 4.17.1` - Open redirect

4. **Review vulnerable code patterns** (app-api/src/routes/vulnerable.ts)
   - Hardcoded credentials
   - Command injection vulnerability
   - Path traversal
   - SQL injection pattern
   - Insecure crypto usage
   - Regex DoS (ReDoS)

**Key Talking Points:**
- "Shift left" security - finding issues before commit
- Developer-friendly feedback in familiar tools
- Real-time detection without context switching

### Phase 2: Git Push & CI/CD Pipeline

**Objective**: Show build-time security gates and JFrog platform integration

1. **Make a small code change**
   ```bash
   # Example: Update a comment or add a console.log
   git add .
   git commit -m "feat: update dashboard display"
   git push origin main
   ```

2. **GitHub Actions pipeline runs**
   - Navigate to Actions tab in GitHub
   - Show the CI pipeline executing
   - Point out JFrog CLI steps (currently as TODO comments)

3. **In JFrog Platform - Show:**

   **Artifactory:**
   - Build info published
   - Dependencies tracked
   - Environment metadata

   **Xray:**
   - Automatic scan triggered
   - Vulnerabilities detected and flagged
   - Policy violations
   - Security issues surfaced

   **Watches & Policies:**
   - Show configured policies (e.g., "Block Critical CVEs")
   - Demonstrate watch notifications
   - Explain policy actions (warn, fail build, etc.)

   **Builds Dashboard:**
   - Show all builds for frogstatus
   - Filter by vulnerable builds
   - Demonstrate impact analysis
   - Show which builds use vulnerable components

**Key Talking Points:**
- Automated security scanning without developer overhead
- Comprehensive tracking of all dependencies
- Policy-based enforcement
- Visibility across all builds and environments

### Phase 3: Fix and Remediate

**Objective**: Show the fix workflow and verification

1. **Switch to clean state**
   ```bash
   npm run set-clean
   npm test  # Verify everything still works
   ```

2. **Verify locally with IDE scanner**
   - Show IDE plugin now reports clean
   - Demonstrate reduced/eliminated vulnerabilities
   - Point out remaining warnings are less critical

3. **View clean dependencies in UI**
   ```bash
   npm run dev
   ```
   - Show Dependency Health panel now shows "ok" status
   - No CVE badges displayed
   - All packages at secure versions

4. **Commit and push clean version**
   ```bash
   git add .
   git commit -m "fix: upgrade dependencies to resolve CVEs"
   git push origin main
   ```

5. **Show clean build in JFrog Platform**
   - New build published
   - Xray scan passes
   - No policy violations
   - Compare with previous vulnerable build

**Key Talking Points:**
- Quick remediation workflow
- Verification at every step
- Build history and comparison
- Compliance tracking

---

## FrogBot Integration Points

FrogBot adds automated PR scanning and fix generation to your workflow.

### Setup FrogBot

1. **Install FrogBot GitHub App**
   - Go to https://github.com/apps/frogbot
   - Install on your repository

2. **Configure FrogBot**
   ```yaml
   # .github/workflows/frogbot.yml
   name: Frogbot Scan
   on:
     pull_request:
       types: [opened, synchronize]

   jobs:
     scan:
       runs-on: ubuntu-latest
       steps:
         - uses: jfrog/frogbot@v2
           env:
             JF_URL: ${{ secrets.JF_URL }}
             JF_ACCESS_TOKEN: ${{ secrets.JF_ACCESS_TOKEN }}
             JF_GIT_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```

### Demo Scenarios with FrogBot

#### Scenario A: PR with Vulnerabilities

1. **Create a branch with vulnerabilities**
   ```bash
   git checkout -b feature/add-logging
   npm run set-vulnerable
   # Make some code changes
   git add .
   git commit -m "feat: add logging functionality"
   git push origin feature/add-logging
   ```

2. **Create Pull Request**
   - FrogBot automatically scans
   - Comments on PR with vulnerability findings
   - Shows CVE details, severity, fixes

3. **Demonstrate PR Comments**
   - Vulnerability summary
   - Contextual insights
   - Recommended remediation
   - Links to CVE databases

**Talking Points:**
- Security review automation
- No manual intervention needed
- Educational feedback for developers
- Prevents vulnerable code from merging

#### Scenario B: FrogBot Auto-Fix PR

FrogBot can automatically create PRs to fix vulnerabilities.

1. **Enable auto-fix in FrogBot config**
   ```yaml
   # In FrogBot config
   autoFix: true
   ```

2. **FrogBot detects vulnerabilities on main branch**
   - Automatically creates a "fix" branch
   - Updates package.json with secure versions
   - Opens PR with detailed explanation
   - Includes test results

3. **Review and merge FrogBot's PR**
   - Show the automated fix
   - Demonstrate test pass
   - Merge to apply fixes

**Talking Points:**
- Proactive vulnerability management
- Automated remediation suggestions
- Reduces developer toil
- Continuous security improvement

#### Scenario C: Fail PR on Policy Violation

1. **Configure strict Xray policy**
   - Block on Critical or High severity
   - Enforce curation rules

2. **Submit PR with violations**
   - FrogBot scans and finds policy violations
   - PR is automatically marked as failed
   - Clear explanation of what must be fixed

3. **Show enforcement**
   - Cannot merge until fixed
   - Policy-driven guardrails
   - Compliance maintained

**Talking Points:**
- Automated policy enforcement
- No manual security reviews needed
- Consistent standards across teams
- Audit trail and compliance

---

## Vulnerability Details

### Dependency Vulnerabilities (Vulnerable State)

| Package | Vulnerable Version | CVEs | Severity | Description |
|---------|-------------------|------|----------|-------------|
| lodash | 4.17.19 | CVE-2020-8203 | High | Prototype pollution vulnerability |
| axios | 0.21.1 | CVE-2021-3749 | Medium | Server-Side Request Forgery (SSRF) |
| jsonwebtoken | 8.5.1 | CVE-2022-23529, CVE-2022-23539, CVE-2022-23540, CVE-2022-23541 | Critical | JWT verification bypass vulnerabilities |
| node-forge | 0.10.0 | CVE-2022-24771, CVE-2022-24772, CVE-2022-24773 | High | Cryptographic vulnerabilities and signature forgery |
| express | 4.17.1 | CVE-2022-24999 | Medium | Open redirect vulnerability |

### Code-Level Vulnerabilities (SAST Findings)

Located in `app-api/src/routes/vulnerable.ts`:

1. **Hardcoded Credentials** (Lines 9-11)
   - Username and password in source code
   - Severity: Critical
   - Fix: Use environment variables or secrets management

2. **Insecure Cryptography** (Lines 28-32)
   - Using deprecated `crypto.createCipher`
   - Severity: High
   - Fix: Use `crypto.createCipheriv` with proper IV

3. **Command Injection** (Lines 41-47)
   - Unsanitized user input passed to `execSync`
   - Severity: Critical
   - Fix: Validate and sanitize input, use parameterized commands

4. **Path Traversal** (Lines 54-60)
   - No path sanitization allowing `../` attacks
   - Severity: High
   - Fix: Use `path.normalize` and validate against allowed paths

5. **SQL Injection** (Lines 67-75)
   - String concatenation for SQL query construction
   - Severity: Critical
   - Fix: Use parameterized queries/prepared statements

6. **Insecure Random** (Lines 82-87)
   - `Math.random()` for security-sensitive tokens
   - Severity: Medium
   - Fix: Use `crypto.randomBytes`

7. **Secrets Exposure** (Lines 94-101)
   - API keys and credentials in response
   - Severity: High
   - Fix: Remove sensitive data from responses

8. **Regex DoS** (Lines 108-113)
   - Complex regex vulnerable to catastrophic backtracking
   - Severity: Medium
   - Fix: Simplify regex or use alternative validation

---

## Talking Points

### Opening

"Today I'll show you how JFrog's integrated security platform helps organizations shift security left and maintain a secure software supply chain. We'll see vulnerabilities detected, tracked, and remediated across the entire SDLC."

### During Local Development

"Developers get immediate feedback right in their IDE - no need to wait for CI/CD or a security team review. This shifts security left and makes it part of the developer workflow."

### During CI/CD

"Every build is automatically scanned, tracked, and enforced against your security policies. You get complete visibility into what's deployed and can quickly identify and remediate issues."

### FrogBot Integration

"FrogBot takes this further by automating security reviews in pull requests and even suggesting fixes. This removes manual overhead while maintaining high security standards."

### Value Proposition

- **Shift Left**: Find issues before they reach production
- **Automation**: Reduce manual security reviews
- **Visibility**: Complete supply chain transparency
- **Policy Enforcement**: Automated governance
- **Developer Experience**: Security without friction
- **Continuous Monitoring**: Ongoing vulnerability detection

---

## Quick Reference Commands

```bash
# Switch states
npm run set-vulnerable    # Switch to vulnerable dependencies
npm run set-clean         # Switch to clean dependencies

# Development
npm run dev               # Start both API and UI in dev mode
npm test                  # Run all tests
npm run build             # Build for production

# Check current state
cat .current-state        # Shows "vulnerable" or "clean"

# View vulnerabilities
npm audit                 # npm's vulnerability report
```

---

## Advanced Demo Scenarios

### Scenario: Curation Demo

1. Show package curation policies in JFrog Platform
2. Attempt to use a blocked package
3. Demonstrate curation blocking or approving packages
4. Show audit trail of package approvals

### Scenario: Environment Promotion

1. Show build in DEV environment
2. Promote to QA after security scan passes
3. Demonstrate environment-specific policies
4. Show promotion history and rollback capability

### Scenario: Impact Analysis

1. When a new CVE is discovered
2. Show Xray's impact analysis
3. Identify all affected builds and deployments
4. Demonstrate rapid response capability

---

## Troubleshooting

### IDE Plugin Not Detecting Issues

- Verify JFrog platform URL and credentials
- Check that Xray is enabled
- Refresh the plugin scan manually
- Review plugin logs for errors

### FrogBot Not Commenting on PRs

- Verify GitHub App installation
- Check GitHub secrets are configured
- Review FrogBot workflow logs
- Ensure repository permissions are correct

### Dependencies Not Showing as Vulnerable

- Verify you ran `npm run set-vulnerable`
- Check `.current-state` file contents
- Rebuild after state change: `npm run build`
- Clear caches: `rm -rf node_modules && npm install`

---

## Next Steps

After the demo, consider:

1. **Customize vulnerability states**: Edit `scripts/dependency-states.json` to include your specific packages
2. **Add more vulnerable code patterns**: Extend `app-api/src/routes/vulnerable.ts`
3. **Configure real JFrog CLI steps**: Update `.github/workflows/ci.yml` with your JFrog setup
4. **Set up FrogBot**: Install and configure for automated PR scanning
5. **Create custom policies**: Define your organization's security policies in Xray

---

## Resources

- [JFrog Xray Documentation](https://www.jfrog.com/confluence/display/JFROG/JFrog+Xray)
- [FrogBot GitHub](https://github.com/jfrog/frogbot)
- [JFrog IDE Plugins](https://www.jfrog.com/confluence/display/JFROG/IDE+Integration)
- [JFrog CLI](https://www.jfrog.com/confluence/display/CLI/JFrog+CLI)
