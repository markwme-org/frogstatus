import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Import and set up API routes
const setupApiRoutes = async () => {
  const { default: healthRouter } = await import('../app-api/dist/routes/health.js');
  const { default: buildRouter } = await import('../app-api/dist/routes/build.js');
  const { default: dependenciesRouter } = await import('../app-api/dist/routes/dependencies.js');

  app.use('/api', healthRouter);
  app.use('/api', buildRouter);
  app.use('/api', dependenciesRouter);
};

await setupApiRoutes();

// Serve UI static files
app.use(express.static(path.join(__dirname, '../app-ui/dist')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../app-ui/dist/index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`FrogStatus server running on port ${PORT}`);
});
