import { Router, Request, Response } from 'express';
import type { AuthManager } from '../auth';

export function createAuthRouter(auth: AuthManager): Router {
  const router = Router();

  router.post('/operator', async (req: Request, res: Response) => {
    const { pin } = req.body as { pin?: string };
    const ip = req.ip ?? '0.0.0.0';

    if (!pin) {
      res.status(400).json({ error: { code: 'AUTH_REQUIRED', message: 'PIN required' } });
      return;
    }

    if (auth.isLockedOut(ip)) {
      const retryAfter = auth.getRetryAfterSeconds(ip) ?? 300;
      res
        .status(429)
        .set('X-Retry-After', String(retryAfter))
        .set('X-RateLimit-Remaining', '0')
        .json({ error: { code: 'RATE_LIMITED', message: 'Too many failed attempts', details: { retryAfter } } });
      return;
    }

    const session = await auth.createSession('operator', pin, ip);
    if (!session) {
      const remaining = auth.getRemainingAttempts(ip);
      res
        .status(401)
        .set('X-RateLimit-Remaining', String(remaining))
        .json({ error: { code: 'AUTH_REQUIRED', message: 'Invalid PIN' } });
      return;
    }

    res
      .cookie('pconair_operator_session', session.id, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: session.expiresAt - session.createdAt,
      })
      .json({ ok: true });
  });

  router.post('/admin', async (req: Request, res: Response) => {
    const { pin } = req.body as { pin?: string };
    const ip = req.ip ?? '0.0.0.0';

    if (!pin) {
      res.status(400).json({ error: { code: 'AUTH_REQUIRED', message: 'PIN required' } });
      return;
    }

    if (auth.isLockedOut(ip)) {
      const retryAfter = auth.getRetryAfterSeconds(ip) ?? 300;
      res
        .status(429)
        .set('X-Retry-After', String(retryAfter))
        .set('X-RateLimit-Remaining', '0')
        .json({ error: { code: 'RATE_LIMITED', message: 'Too many failed attempts', details: { retryAfter } } });
      return;
    }

    const session = await auth.createSession('admin', pin, ip);
    if (!session) {
      const remaining = auth.getRemainingAttempts(ip);
      res
        .status(401)
        .set('X-RateLimit-Remaining', String(remaining))
        .json({ error: { code: 'AUTH_REQUIRED', message: 'Invalid PIN' } });
      return;
    }

    res
      .cookie('pconair_admin_session', session.id, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: session.expiresAt - session.createdAt,
      })
      .json({ ok: true });
  });

  router.post('/logout', (req: Request, res: Response) => {
    const opSessionId = req.cookies?.pconair_operator_session as string | undefined;
    const adminSessionId = req.cookies?.pconair_admin_session as string | undefined;
    if (opSessionId) auth.deleteSession(opSessionId);
    if (adminSessionId) auth.deleteSession(adminSessionId);
    res
      .clearCookie('pconair_operator_session')
      .clearCookie('pconair_admin_session')
      .json({ ok: true });
  });

  return router;
}
