import { Router } from 'express';
import { getConfig } from '../config/index.js';

const router = Router();

router.get('/build', (req, res) => {
  const config = getConfig();
  res.json(config.buildMetadata);
});

export default router;
