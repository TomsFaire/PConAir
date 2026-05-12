import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createStateStore } from '../src/main/state';
import { createFullServer } from './_test-server';

const AUTH_CONFIG = {
  operatorPin: '1234',
  adminPin: 'supersecret',
  operatorSessionMs: 3600000,
  adminSessionMs: 3600000,
};

describe('Auth routes', () => {
  let app: Express;

  beforeEach(() => {
    const store = createStateStore();
    ({ app } = createFullServer({
      store,
      operatorPin: AUTH_CONFIG.operatorPin,
      adminPin: AUTH_CONFIG.adminPin,
      operatorSessionMs: AUTH_CONFIG.operatorSessionMs,
      adminSessionMs: AUTH_CONFIG.adminSessionMs,
    }));
  });

  it('POST /auth/operator with correct PIN sets session cookie', async () => {
    const res = await request(app)
      .post('/auth/operator')
      .send({ pin: '1234' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('operator');
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('pconair_operator_session');
  });

  it('POST /auth/operator with wrong PIN returns 401', async () => {
    const res = await request(app)
      .post('/auth/operator')
      .send({ pin: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('POST /auth/admin with correct PIN sets admin cookie', async () => {
    const res = await request(app)
      .post('/auth/admin')
      .send({ pin: 'supersecret' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
    expect(res.headers['set-cookie'][0]).toContain('pconair_admin_session');
  });

  it('returns 429 after 5 failed PIN attempts in 5 minutes', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await request(app).post('/auth/operator').send({ pin: 'nope' });
      expect(r.status).toBe(401);
    }
    const blocked = await request(app).post('/auth/operator').send({ pin: '1234' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(blocked.headers['x-retry-after']).toBeDefined();
    expect(blocked.headers['x-ratelimit-remaining']).toBe('0');
  });

  it('POST /auth/logout clears operator session', async () => {
    const login = await request(app).post('/auth/operator').send({ pin: '1234' });
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    const out = await request(app)
      .post('/auth/logout')
      .set('Cookie', cookie)
      .send({ role: 'operator' });
    expect(out.status).toBe(200);
    expect(out.body.message).toMatch(/logged out/i);
    const after = await request(app).get('/api/status').set('Cookie', cookie);
    expect(after.status).toBe(401);
  });
});

describe('API routes', () => {
  let app: Express;
  let operatorCookie: string;

  beforeEach(async () => {
    const store = createStateStore();
    ({ app } = createFullServer({
      store,
      operatorPin: AUTH_CONFIG.operatorPin,
      adminPin: AUTH_CONFIG.adminPin,
      operatorSessionMs: AUTH_CONFIG.operatorSessionMs,
      adminSessionMs: AUTH_CONFIG.adminSessionMs,
    }));
    const res = await request(app)
      .post('/auth/operator')
      .send({ pin: '1234' });
    operatorCookie = res.headers['set-cookie'][0].split(';')[0];
  });

  it('GET /api/status returns full AppState for authenticated operator', async () => {
    const res = await request(app)
      .get('/api/status')
      .set('Cookie', operatorCookie);
    expect(res.status).toBe(200);
    expect(res.body.currentMode).toBe('idle');
    expect(res.body.connectionStatus.adminShowLocked).toBe(false);
  });

  it('GET /api/status returns 401 without auth', async () => {
    const res = await request(app).get('/api/status');
    expect(res.status).toBe(401);
  });

  it('POST /api/mode switches mode', async () => {
    const res = await request(app)
      .post('/api/mode')
      .set('Cookie', operatorCookie)
      .send({ mode: 'url' });
    expect(res.status).toBe(200);
    expect(res.body.currentMode).toBe('url');
    // Response should be lean — not the full AppState
    expect(res.body).not.toHaveProperty('connectionStatus');
  });

  it('POST /api/mode rejects invalid mode', async () => {
    const res = await request(app)
      .post('/api/mode')
      .set('Cookie', operatorCookie)
      .send({ mode: 'banana' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_MODE');
  });

  it('GET /api/health returns uptime and version', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Cookie', operatorCookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('version');
  });
});

describe('Security headers', () => {
  let app: Express;

  beforeEach(() => {
    const store = createStateStore();
    ({ app } = createFullServer({
      store,
      operatorPin: AUTH_CONFIG.operatorPin,
      adminPin: AUTH_CONFIG.adminPin,
      operatorSessionMs: AUTH_CONFIG.operatorSessionMs,
      adminSessionMs: AUTH_CONFIG.adminSessionMs,
    }));
  });

  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/api/status');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options: DENY', async () => {
    const res = await request(app).get('/api/status');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('sets Cache-Control: no-store on API responses', async () => {
    const res = await request(app).get('/api/status');
    expect(res.headers['cache-control']).toBe('no-store');
  });
});
