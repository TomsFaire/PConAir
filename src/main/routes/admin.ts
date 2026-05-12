import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import type { AuthManager } from '../auth';

const ADMIN_HTML = path.resolve(__dirname, '../../renderer/admin/index.html');

const HTML_CSP =
  "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' https:; font-src 'self'";

const ADMIN_UNLOCK_JS = `(function(){
  var f=document.getElementById('unlock-form');
  if(!f)return;
  f.addEventListener('submit',function(ev){
    ev.preventDefault();
    var pin=document.getElementById('pin').value;
    fetch('/auth/unlock-admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:pin})})
      .then(function(r){return r.json().then(function(j){return{ok:r.ok,status:r.status,j:j};});})
      .then(function(x){
        if(x.ok){window.location.reload();return;}
        var err=document.getElementById('err');
        if(err)err.textContent=(x.j&&x.j.error&&x.j.error.message)||'Unlock failed';
      }).catch(function(){var err=document.getElementById('err');if(err)err.textContent='Network error';});
  });
})();`;

const FALLBACK_ADMIN_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>PC On Air — Admin</title></head>
<body><p>PC On Air Admin UI</p></body></html>`;

const LOCKED_SHELL = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin locked</title><style>body{font-family:system-ui,sans-serif;max-width:28rem;margin:2rem auto;padding:0 1rem}</style></head>
<body>
<h1>Admin locked for show.</h1>
<p>Enter admin PIN to unlock.</p>
<p id="err" style="color:#b00020"></p>
<form id="unlock-form">
  <label>PIN <input id="pin" type="password" name="pin" autocomplete="off" required style="width:100%;padding:0.5rem;margin:0.5rem 0"/></label>
  <button type="submit" style="padding:0.5rem 1rem">Unlock</button>
</form>
<script src="/admin/assets/admin-unlock.js"></script>
</body></html>`;

export interface AdminRouterDeps {
  auth: AuthManager;
  getAdminShowLocked: () => boolean;
}

export function createAdminRouter(d: AdminRouterDeps): Router {
  const router = Router();

  router.get('/assets/admin-unlock.js', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.send(ADMIN_UNLOCK_JS);
  });

  router.get('/', (req: Request, res: Response) => {
    const adminSid = req.cookies?.pconair_admin_session as string | undefined;
    const opSid = req.cookies?.pconair_operator_session as string | undefined;
    const adminSession = adminSid ? d.auth.getSession(adminSid) : null;
    const opSession = opSid ? d.auth.getSession(opSid) : null;

    if (!adminSession || adminSession.role !== 'admin') {
      if (opSession) {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        });
        return;
      }
      res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
      return;
    }

    if (d.getAdminShowLocked()) {
      const accept = req.headers.accept ?? '';
      if (accept.includes('application/json')) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Admin locked for show. Enter admin PIN to unlock.',
          },
        });
        return;
      }
      res.status(403);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', HTML_CSP);
      res.send(LOCKED_SHELL);
      return;
    }

    res.setHeader('Content-Security-Policy', HTML_CSP);
    if (fs.existsSync(ADMIN_HTML)) {
      res.sendFile(ADMIN_HTML);
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(FALLBACK_ADMIN_HTML);
    }
  });

  return router;
}
