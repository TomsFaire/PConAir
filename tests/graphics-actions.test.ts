import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createStateStore } from '../src/main/state';
import { createFullServer } from './_test-server';

function makeServer() {
  const store = createStateStore();
  const server = createFullServer({
    store,
    operatorPin: 'test1234',
    adminPin: 'adminpass8',
    port: 0,
  });
  return { server, store };
}

async function getOperatorCookie(app: Express) {
  const res = await request(app).post('/auth/operator').send({ pin: 'test1234' });
  return (res.headers['set-cookie'] as unknown as string[])[0];
}

describe('graphics_scoreboard_set action', () => {
  it('initialises scoreboard from null when all fields provided', async () => {
    const { server, store } = makeServer();
    const cookie = await getOperatorCookie(server.app);

    const res = await request(server.app)
      .post('/api/action')
      .set('Cookie', cookie)
      .send({
        action_id: 'graphics_scoreboard_set',
        params: {
          teamA: 'BOS', teamB: 'LAL',
          scoreA: 88, scoreB: 84,
          quarter: 'Q3', gameClock: '7:42', gameClockRunning: false,
          shotClock: 14, shotClockRunning: false,
          possession: 'a',
          foulsA: 4, foulsB: 5,
          timeoutsA: 5, timeoutsB: 4,
        },
      });

    expect(res.status).toBe(200);
    const sb = store.getState().graphics.scoreboard!;
    expect(sb.teamA).toBe('BOS');
    expect(sb.teamB).toBe('LAL');
    expect(sb.scoreA).toBe(88);
    expect(sb.scoreB).toBe(84);
    expect(sb.quarter).toBe('Q3');
    expect(sb.gameClock).toBe('7:42');
    expect(sb.gameClockRunning).toBe(false);
    expect(sb.shotClock).toBe(14);
    expect(sb.possession).toBe('a');
    expect(sb.foulsA).toBe(4);
    expect(sb.timeoutsA).toBe(5);
  });

  it('partial update merges into existing scoreboard', async () => {
    const { server, store } = makeServer();
    const cookie = await getOperatorCookie(server.app);

    // Init
    await request(server.app)
      .post('/api/action')
      .set('Cookie', cookie)
      .send({ action_id: 'graphics_scoreboard_set', params: { teamA: 'BOS', teamB: 'LAL', scoreA: 80, scoreB: 80, quarter: 'Q2', gameClock: '10:00', gameClockRunning: false, shotClock: 24, shotClockRunning: false, possession: null, foulsA: 0, foulsB: 0, timeoutsA: 7, timeoutsB: 7 } });

    // Partial update
    await request(server.app)
      .post('/api/action')
      .set('Cookie', cookie)
      .send({ action_id: 'graphics_scoreboard_set', params: { scoreA: 90, quarter: 'Q3' } });

    const sb = store.getState().graphics.scoreboard!;
    expect(sb.scoreA).toBe(90);
    expect(sb.quarter).toBe('Q3');
    expect(sb.teamA).toBe('BOS'); // unchanged
    expect(sb.teamB).toBe('LAL'); // unchanged
  });

  it('initialises with defaults for unspecified fields when scoreboard is null', async () => {
    const { server, store } = makeServer();
    const cookie = await getOperatorCookie(server.app);

    await request(server.app)
      .post('/api/action')
      .set('Cookie', cookie)
      .send({ action_id: 'graphics_scoreboard_set', params: { teamA: 'GSW' } });

    const sb = store.getState().graphics.scoreboard!;
    expect(sb.teamA).toBe('GSW');
    expect(sb.teamB).toBe('AWY');  // default
    expect(sb.scoreA).toBe(0);     // default
    expect(sb.scoreB).toBe(0);     // default
    expect(sb.quarter).toBe('Q1'); // default
    expect(sb.gameClock).toBe('12:00'); // default
    expect(sb.gameClockRunning).toBe(false); // default
    expect(sb.shotClock).toBe(24); // default
    expect(sb.possession).toBeNull(); // default
  });

  it('returns 401 without auth', async () => {
    const { server } = makeServer();
    const res = await request(server.app)
      .post('/api/action')
      .send({ action_id: 'graphics_scoreboard_set', params: { teamA: 'BOS' } });
    expect(res.status).toBe(401);
  });
});

describe('graphics_score_bump action', () => {
  async function initScoreboard(app: Express, cookie: string) {
    await request(app)
      .post('/api/action')
      .set('Cookie', cookie)
      .send({ action_id: 'graphics_scoreboard_set', params: { teamA: 'BOS', teamB: 'LAL', scoreA: 80, scoreB: 80, quarter: 'Q2', gameClock: '5:00', gameClockRunning: false, shotClock: 24, shotClockRunning: false, possession: null, foulsA: 0, foulsB: 0, timeoutsA: 7, timeoutsB: 7 } });
  }

  it('bumps team A score by +1', async () => {
    const { server, store } = makeServer();
    const cookie = await getOperatorCookie(server.app);
    await initScoreboard(server.app, cookie);

    const res = await request(server.app)
      .post('/api/action')
      .set('Cookie', cookie)
      .send({ action_id: 'graphics_score_bump', params: { team: 'a', delta: 1 } });

    expect(res.status).toBe(200);
    expect(store.getState().graphics.scoreboard?.scoreA).toBe(81);
  });

  it('bumps team B score by +3', async () => {
    const { server, store } = makeServer();
    const cookie = await getOperatorCookie(server.app);
    await initScoreboard(server.app, cookie);

    await request(server.app)
      .post('/api/action')
      .set('Cookie', cookie)
      .send({ action_id: 'graphics_score_bump', params: { team: 'b', delta: 3 } });

    expect(store.getState().graphics.scoreboard?.scoreB).toBe(83);
  });

  it('clamps score to 0 minimum', async () => {
    const { server, store } = makeServer();
    const cookie = await getOperatorCookie(server.app);
    await initScoreboard(server.app, cookie);

    // Set team A to 0, then try to subtract 5
    await request(server.app)
      .post('/api/action')
      .set('Cookie', cookie)
      .send({ action_id: 'graphics_scoreboard_set', params: { scoreA: 0 } });
    await request(server.app)
      .post('/api/action')
      .set('Cookie', cookie)
      .send({ action_id: 'graphics_score_bump', params: { team: 'a', delta: -5 } });

    expect(store.getState().graphics.scoreboard?.scoreA).toBe(0);
  });

  it('auto-initialises scoreboard with defaults if null', async () => {
    const { server, store } = makeServer();
    const cookie = await getOperatorCookie(server.app);

    const res = await request(server.app)
      .post('/api/action')
      .set('Cookie', cookie)
      .send({ action_id: 'graphics_score_bump', params: { team: 'a', delta: 2 } });

    expect(res.status).toBe(200);
    expect(store.getState().graphics.scoreboard?.scoreA).toBe(2);
    expect(store.getState().graphics.scoreboard?.scoreB).toBe(0);
  });

  it('returns 400 for invalid team', async () => {
    const { server } = makeServer();
    const cookie = await getOperatorCookie(server.app);

    const res = await request(server.app)
      .post('/api/action')
      .set('Cookie', cookie)
      .send({ action_id: 'graphics_score_bump', params: { team: 'c', delta: 1 } });

    expect(res.status).toBe(400);
  });

  it('returns 400 for non-integer delta', async () => {
    const { server } = makeServer();
    const cookie = await getOperatorCookie(server.app);

    const res = await request(server.app)
      .post('/api/action')
      .set('Cookie', cookie)
      .send({ action_id: 'graphics_score_bump', params: { team: 'a', delta: 1.5 } });

    expect(res.status).toBe(400);
  });
});
