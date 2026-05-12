import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import type { AuthManager } from '../auth';
import { requireOperator } from './middleware';

const OPERATOR_HTML = path.resolve(__dirname, '../../renderer/operator/index.html');

const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>PC On Air — Operator</title></head>
<body><p>PC On Air Operator UI</p></body>
</html>`;

export function createOperatorRouter(auth: AuthManager): Router {
  const router = Router();
  const opGuard = requireOperator(auth);

  router.get('/', opGuard, (_req: Request, res: Response) => {
    if (fs.existsSync(OPERATOR_HTML)) {
      res.sendFile(OPERATOR_HTML);
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.send(FALLBACK_HTML);
    }
  });

  return router;
}
