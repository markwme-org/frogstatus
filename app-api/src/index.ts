import express from 'express';
import cors from 'cors';
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

app.listen(config.port, () => {
  console.log(`API server running on port ${config.port}`);
});

export default app;
