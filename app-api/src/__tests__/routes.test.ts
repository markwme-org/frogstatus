import request from 'supertest';
import express from 'express';
import healthRouter from '../routes/health.js';
import buildRouter from '../routes/build.js';
import dependenciesRouter from '../routes/dependencies.js';

const app = express();
app.use('/api', healthRouter);
app.use('/api', buildRouter);
app.use('/api', dependenciesRouter);

describe('API Routes', () => {
  describe('GET /api/health', () => {
    it('should return ok status', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/build', () => {
    it('should return build metadata', async () => {
      const response = await request(app).get('/api/build');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('buildName');
      expect(response.body).toHaveProperty('buildNumber');
      expect(response.body).toHaveProperty('gitCommit');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('xrayStatus');
    });
  });

  describe('GET /api/dependencies', () => {
    it('should return list of dependencies', async () => {
      const response = await request(app).get('/api/dependencies');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const dependency = response.body[0];
      expect(dependency).toHaveProperty('name');
      expect(dependency).toHaveProperty('version');
      expect(dependency).toHaveProperty('status');
    });
  });
});
