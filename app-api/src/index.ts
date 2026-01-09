import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';
import { getConfig } from './config/index.js';
import healthRouter from './routes/health.js';
import buildRouter from './routes/build.js';
import dependenciesRouter from './routes/dependencies.js';
import chatRouter from './routes/chat.js';
import { initializeMCPClient, closeMCPClient } from './services/mcpService.js';

// Load environment variables from root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
const result = dotenvConfig({ path: envPath });

if (result.error) {
  console.log('⚠️  No .env file found at:', envPath);
  console.log('   API keys will need to be set via environment variables');
} else {
  console.log('✅ Loaded .env file from:', envPath);
}

const app = express();
const config = getConfig();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRouter);
app.use('/api', buildRouter);
app.use('/api', dependenciesRouter);
app.use('/api', chatRouter);

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

// Initialize MCP client for JFrog integration
await initializeMCPClient();

app.listen(config.port, () => {
  console.log(`API server running on port ${config.port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing MCP client...');
  await closeMCPClient();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing MCP client...');
  await closeMCPClient();
  process.exit(0);
});

export default app;
