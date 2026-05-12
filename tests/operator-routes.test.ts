import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../src/main/server';
import { createStateStore } from '../src/main/state';
import { createAuthManager } from '../src/main/auth';

const AUTH_CONFIG = {
  operatorPin: '1234',
  adminPin: 'supersecret',
  operatorSessionMs: 3600000,
  adminSessionMs: 3600000,
  maxFailures: 5,
  lockoutMs: 300000,
};

describe('GET /operator', () => {
  let app: ReturnType<typeof createServer>['app'];
  let operatorCookie: string;

  beforeEach(async () => {
    const store = createStateStore();
    const auth = createAuthManager(AUTH_CONFIG);
    ({ app } = createServer({ store, auth }));
    const loginRes = await request(app).post('/auth/operator').send({ pin: '1234' });
    operatorCookie = loginRes.headers['set-cookie'][0].split(';')[0];
  });

  it('returns 200 with HTML content for authenticated operator', async () => {
    const res = await request(app)
      .get('/operator')
      .set('Cookie', operatorCookie);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('PC On Air');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/operator');
    expect(res.status).toBe(401);
  });
});
