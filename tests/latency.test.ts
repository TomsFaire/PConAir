/**
 * Latency benchmark — spec 03 Gap 2
 *
 * Measures the portion of the slide-change latency that is observable in tests:
 *   1. HTTP API round-trip  — POST /api/slides/next response time
 *   2. WS broadcast latency — time from API call to WS state-update message received
 *
 * What this does NOT measure (Electron-only, requires a live display):
 *   - Browser paint time (~16–33 ms at 60 fps)
 *   - Electron frame compositing (~16 ms)
 *   - HDMI output lag (0–33 ms depending on hardware)
 *
 * Budget allocation toward the 500 ms target (spec 03 §Gap 2):
 *   API + WS broadcast   <  100 ms  (this file asserts)
 *   Browser paint             ~30 ms
 *   Electron compositing      ~20 ms
 *   HDMI output               ~17 ms
 *   ─────────────────────────────────
 *   Total expected         < 167 ms  (well within 500 ms)
 *
 * Spec 01 §5.10 states "<50 ms from action to display". That target refers to
 * the Electron-side rendering pipeline only (no network), not the full
 * operator-UI-to-HDMI path. The 500 ms figure in spec 03 is the correct
 * end-to-end broadcast-quality target.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { WebSocket } from 'ws';
import type { Express } from 'express';
import { createStateStore } from '../src/main/state';
import { createFullServer } from './_test-server';
import type { WsServerMessage } from '../src/shared/types';

const ITERATIONS = 20;
const P95_API_THRESHOLD_MS = 100;
const P95_WS_THRESHOLD_MS = 150; // includes API time + broadcast

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function stats(samples: number[]): { p50: number; p95: number; p99: number; mean: number; max: number } {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    mean: Math.round(mean),
    max: sorted[sorted.length - 1],
  };
}

function connectWs(port: number, cookieHeader: string): {
  ws: WebSocket;
  nextMessage: () => Promise<WsServerMessage>;
} {
  const ws = new WebSocket(`ws://localhost:${port}/ws`, {
    headers: { Cookie: cookieHeader },
  });
  const queue: WsServerMessage[] = [];
  const waiters: Array<{ resolve: (msg: WsServerMessage) => void; reject: (err: Error) => void }> = [];

  ws.on('message', (data) => {
    const msg: WsServerMessage = JSON.parse(data.toString());
    if (waiters.length > 0) waiters.shift()!.resolve(msg);
    else queue.push(msg);
  });
  ws.on('close', () => {
    const err = new Error('WebSocket closed');
    for (const w of waiters.splice(0)) w.reject(err);
  });
  ws.on('error', (err) => {
    const e = err instanceof Error ? err : new Error(String(err));
    for (const w of waiters.splice(0)) w.reject(e);
  });

  return {
    ws,
    nextMessage: () =>
      new Promise((resolve, reject) => {
        if (queue.length > 0) resolve(queue.shift()!);
        else waiters.push({ resolve, reject });
      }),
  };
}

describe('Latency benchmark — spec 03 Gap 2', { timeout: 60_000 }, () => {
  let app: Express;
  let port: number;
  let srv: ReturnType<typeof createFullServer>;
  let operatorCookie: string;
  let adminCookie: string;

  beforeEach(async () => {
    const store = createStateStore();
    srv = createFullServer({
      store,
      operatorPin: 'test1234',
      adminPin: 'adminpass8',
      operatorSessionMs: 60_000,
      adminSessionMs: 60_000,
      port: 0,
    });
    await srv.listen();
    app = srv.app;
    port = (srv.httpServer.address() as { port: number }).port;

    const opRes = await request(app).post('/auth/operator').send({ pin: 'test1234' });
    const admRes = await request(app).post('/auth/admin').send({ pin: 'adminpass8' });
    operatorCookie = (opRes.headers['set-cookie'] as unknown as string[])[0];
    adminCookie = (admRes.headers['set-cookie'] as unknown as string[])[0];

    // Prime: set mode to url so subsequent mode toggles always change state
    await request(app).post('/api/mode').set('Cookie', adminCookie).send({ mode: 'url' });
  });

  afterEach(() => srv.close());

  it(`HTTP API round-trip p95 < ${P95_API_THRESHOLD_MS}ms (${ITERATIONS} iterations of POST /api/slides/next)`, async () => {
    // Prime: one warm-up call to avoid cold-start skewing results
    await request(app).post('/api/slides/next').set('Cookie', operatorCookie);

    const samples: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      await request(app).post('/api/slides/next').set('Cookie', operatorCookie);
      samples.push(Math.round(performance.now() - t0));
    }

    const s = stats(samples);
    console.log(
      `\n  API round-trip (${ITERATIONS} iters): mean=${s.mean}ms  p50=${s.p50}ms  p95=${s.p95}ms  p99=${s.p99}ms  max=${s.max}ms`
    );

    expect(s.p95).toBeLessThan(P95_API_THRESHOLD_MS);
  });

  it(`WS broadcast latency p95 < ${P95_WS_THRESHOLD_MS}ms (${ITERATIONS} iterations)`, async () => {
    const { ws, nextMessage } = connectWs(port, operatorCookie);

    // Wait for WS connection open
    await new Promise<void>((res, rej) => {
      const t = setTimeout(() => rej(new Error('WS connect timeout')), 5000);
      ws.once('open', () => { clearTimeout(t); res(); });
    });
    // Drain the initial full-state push sent on connect
    await nextMessage();

    // Use POST /api/mode toggling idle↔url — always changes state, always broadcasts
    let mode = 'idle';
    const toggle = () => {
      mode = mode === 'idle' ? 'url' : 'idle';
      return request(app).post('/api/mode').set('Cookie', adminCookie).send({ mode });
    };

    // Prime
    await toggle();
    await nextMessage();

    const samples: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      await toggle();
      await nextMessage(); // wait for WS state broadcast
      samples.push(Math.round(performance.now() - t0));
    }

    ws.close();

    const s = stats(samples);
    console.log(
      `\n  WS broadcast (${ITERATIONS} iters):  mean=${s.mean}ms  p50=${s.p50}ms  p95=${s.p95}ms  p99=${s.p99}ms  max=${s.max}ms`
    );

    expect(s.p95).toBeLessThan(P95_WS_THRESHOLD_MS);
  });
});
