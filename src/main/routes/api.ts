import { Router, Request, Response, NextFunction } from 'express';
import type { StateStore } from '../state';
import type { AuthManager } from '../auth';
import type { Mode } from '../../shared/types';

const VALID_MODES: Mode[] = ['slides', 'url', 'l3', 'media-library', 'idle'];
const START_TIME = Date.now();

function requireOperator(auth: AuthManager) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const sessionId =
      (req.cookies?.pconair_operator_session as string | undefined) ??
      (req.cookies?.pconair_admin_session as string | undefined); // admin can do anything operator can
    if (!sessionId || !auth.getSession(sessionId)) {
      res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
      return;
    }
    next();
  };
}

export function createApiRouter(store: StateStore, auth: AuthManager): Router {
  const router = Router();
  const opGuard = requireOperator(auth);

  router.get('/status', opGuard, (_req: Request, res: Response) => {
    res.json(store.getState());
  });

  router.get('/health', opGuard, (_req: Request, res: Response) => {
    const state = store.getState();
    res.json({
      version: process.env.npm_package_version ?? '0.1.0',
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
      currentMode: state.currentMode,
      wsClients: state.connectionStatus.webSocketClients,
      companionConnected: state.connectionStatus.companionConnected,
      lastError: null,
    });
  });

  router.post('/mode', opGuard, (req: Request, res: Response) => {
    const { mode } = req.body as { mode?: string };
    if (!mode || !VALID_MODES.includes(mode as Mode)) {
      res.status(400).json({
        error: { code: 'INVALID_MODE', message: `mode must be one of: ${VALID_MODES.join(', ')}` },
      });
      return;
    }
    store.setState({ currentMode: mode as Mode });
    res.json({ currentMode: mode as Mode });
  });

  return router;
}
