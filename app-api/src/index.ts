import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getConfig } from './config/index.js';
import healthRouter from './routes/health.js';
import buildRouter from './routes/build.js';
import dependenciesRouter from './routes/dependencies.js';

const app = express();
const config = getConfig();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRouter);
app.use('/api', buildRouter);
app.use('/api', dependenciesRouter);

// Conditionally load vulnerable routes in vulnerable state
// This allows SAST tools to detect security issues in the codebase
async function loadVulnerableRoutes() {
  try {
    const statePath = join(process.cwd(), '.current-state');
    const currentState = readFileSync(statePath, 'utf-8').trim();

    if (currentState === 'vulnerable') {
      const vulnerableRouter = await import('./routes/vulnerable.js');
      app.use('/api', vulnerableRouter.default);
      console.log('⚠️  WARNING: Vulnerable routes are ENABLED');
      console.log('   These routes contain security vulnerabilities for demo purposes');
    }
  } catch (error) {
    // No state file or not in vulnerable mode - skip vulnerable routes
  }
}

await loadVulnerableRoutes();

app.listen(config.port, () => {
  console.log(`API server running on port ${config.port}`);
});

export default app;
