# FrogStatus

A demo application for showcasing JFrog products in end-to-end demonstrations.

## Tech Stack

- **Node.js**: 22.x
- **API**: Express + TypeScript
- **UI**: React + Vite + TypeScript
- **Tests**: Jest (API) + Vitest (UI) + Testing Library
- **Monorepo**: npm workspaces

## Repository Structure

```
frogstatus/
├── app-api/              # Express API server
│   ├── src/
│   │   ├── index.ts      # API entry point
│   │   ├── routes/       # API routes
│   │   ├── config/       # Configuration
│   │   └── __tests__/    # API tests
│   └── package.json
├── app-ui/               # React UI application
│   ├── src/
│   │   ├── main.tsx      # UI entry point
│   │   ├── App.tsx       # Main App component
│   │   ├── components/   # UI components
│   │   ├── api/          # API client functions
│   │   └── __tests__/    # UI tests
│   └── package.json
├── infra/
│   ├── Dockerfile        # Production Docker image
│   └── server.js         # Production server
├── scripts/              # Demo automation scripts (future)
├── jfrog/                # JFrog configurations (future)
└── .github/
    └── workflows/
        └── ci.yml        # GitHub Actions CI pipeline
```

## Quick Start

### Prerequisites

- Node.js 22.x or higher
- npm 10.x or higher

### Installation

```bash
npm install
```

### Development

Run both API and UI in development mode:

```bash
# Terminal 1: Start API server (port 4000)
npm run dev --workspace=app-api

# Terminal 2: Start UI dev server (port 3000, proxies /api to 4000)
npm run dev --workspace=app-ui
```

Then open http://localhost:3000 in your browser.

### Testing

Run all tests:

```bash
npm test
```

Run tests for a specific workspace:

```bash
npm test --workspace=app-api
npm test --workspace=app-ui
```

### Building

Build both workspaces:

```bash
npm run build
```

This creates:
- `app-api/dist/` - Compiled TypeScript API
- `app-ui/dist/` - Production-optimized UI bundle

## Vulnerability States (For JFrog Demos)

FrogStatus supports two dependency states for demonstrating JFrog security features:

### Vulnerable State

Contains intentionally vulnerable dependencies and insecure code patterns:

```bash
npm run set-vulnerable
```

**Vulnerable Dependencies:**
- lodash 4.17.19 - CVE-2020-8203 (Prototype pollution)
- axios 0.21.1 - CVE-2021-3749 (SSRF)
- jsonwebtoken 8.5.1 - Multiple JWT bypass CVEs
- node-forge 0.10.0 - Cryptographic vulnerabilities
- express 4.17.1 - CVE-2022-24999 (Open redirect)

**Vulnerable Code Patterns** (app-api/src/routes/vulnerable.ts):
- Hardcoded credentials
- Command injection
- Path traversal
- SQL injection
- Insecure cryptography
- Regex DoS
- Secrets exposure

### Clean State

Uses secure, up-to-date dependencies:

```bash
npm run set-clean
```

All known CVEs are resolved with updated package versions.

### Demo Usage

```bash
# Start with vulnerable state
npm run set-vulnerable
npm test  # Tests still pass!
npm run dev  # See vulnerabilities in UI

# Scan with JFrog IDE tools
# Push to trigger CI/CD with JFrog Xray

# Fix by switching to clean state
npm run set-clean
npm test  # Verify everything works
npm run dev  # See clean dependencies

# Push clean version
```

**See [DEMO-GUIDE.md](./DEMO-GUIDE.md) for complete demo workflows and FrogBot integration.**

## API Endpoints

### GET /api/health
Returns health check status.

**Response:**
```json
{
  "status": "ok"
}
```

### GET /api/build
Returns build metadata.

**Response:**
```json
{
  "buildName": "frogstatus",
  "buildNumber": "1",
  "gitCommit": "LOCAL_DEV",
  "environment": "dev",
  "xrayStatus": "UNKNOWN"
}
```

### GET /api/dependencies
Returns list of dependencies with health status.

**Response:**
```json
[
  {
    "name": "lodash",
    "version": "4.17.21",
    "status": "ok"
  },
  {
    "name": "jsonwebtoken",
    "version": "9.0.0",
    "status": "ok"
  }
]
```

## Docker

Build the Docker image:

```bash
docker build -f infra/Dockerfile -t frogstatus:latest .
```

Run the container:

```bash
docker run -p 4000:4000 frogstatus:latest
```

Access the application at http://localhost:4000

## Environment Variables

The API reads the following environment variables (all optional):

- `PORT` - API server port (default: 4000)
- `BUILD_NAME` - Build name (default: "frogstatus")
- `BUILD_NUMBER` - Build number (default: "1")
- `GIT_COMMIT` - Git commit hash (default: "LOCAL_DEV")
- `ENVIRONMENT` - Environment name (default: "dev")
- `XRAY_STATUS` - Xray scan status (default: "UNKNOWN")

## UI Features

The FrogStatus UI displays three main panels:

1. **Build Information**
   - Build name and number
   - Git commit hash
   - Environment
   - Xray status

2. **Dependency Health**
   - List of dependencies with versions
   - Status badges (ok/vulnerable/unknown)

3. **JFrog Feature Flags**
   - Curation enforcement status
   - Xray policy information
   - Promotion stage

## Future Enhancements

The following features are planned but not yet implemented:

- [ ] Scripts to switch between vulnerable and fixed dependency states
- [ ] Real Xray scan result integration
- [ ] JFrog CLI integration in CI pipeline
- [ ] Build info collection and publishing
- [ ] Docker image scanning with Xray
- [ ] Curation enforcement demonstration
- [ ] Promotion pipeline states

See `jfrog/README.md` for JFrog integration plans.

## CI/CD

The GitHub Actions workflow (`.github/workflows/ci.yml`) includes:

- Automated testing
- Build verification
- Docker image build
- Placeholder steps for JFrog CLI integration (commented out)

## License

MIT
