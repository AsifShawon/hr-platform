import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server.js';
import { FastifyInstance } from 'fastify';

describe('API Health endpoint', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds to GET /health', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect([200, 503]).toContain(response.statusCode);
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('timestamp');
  });
});
