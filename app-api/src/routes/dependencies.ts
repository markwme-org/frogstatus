import { Router } from 'express';

const router = Router();

interface Dependency {
  name: string;
  version: string;
  status: string;
}

router.get('/dependencies', (req, res) => {
  const dependencies: Dependency[] = [
    {
      name: 'lodash',
      version: '4.17.21',
      status: 'ok',
    },
    {
      name: 'jsonwebtoken',
      version: '9.0.0',
      status: 'ok',
    },
  ];

  res.json(dependencies);
});

export default router;
