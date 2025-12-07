import { Router } from 'express';
import { getDependencies } from '../services/dependencyService.js';

const router = Router();

router.get('/dependencies', (req, res) => {
  try {
    const dependencies = getDependencies();
    res.json(dependencies);
  } catch (error) {
    console.error('Error fetching dependencies:', error);
    res.status(500).json({ error: 'Failed to fetch dependencies' });
  }
});

export default router;
