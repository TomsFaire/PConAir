import { Router, Request, Response } from 'express';
import type { AuthManager } from '../auth';
import { requireAdmin } from './middleware';

export interface SecurityRouterDeps {
  auth: AuthManager;
  setAdminShowLocked: (locked: boolean) => void;
  syncAdminShowLockedToStore: () => void;
}

export function createSecurityRouter(d: SecurityRouterDeps): Router {
  const router = Router();
  const adminGuard = requireAdmin(d.auth);

  router.post('/admin-show-lock', adminGuard, (_req: Request, res: Response) => {
    d.setAdminShowLocked(true);
    d.syncAdminShowLockedToStore();
    res.json({ locked: true });
  });

  return router;
}
