import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { getPassword, getJwtSecret, verifyAuth, type Bindings } from '../index';

export const authRouter = new Hono<{ Bindings: Bindings }>();

const handleLogin = async (c: any) => {
  let body: { password?: string; passcode?: string } = {};
  try {
    body = await c.req.json();
  } catch {}

  const required = getPassword(c);
  const input = (body.password || body.passcode || '').trim();

  if (!required) {
    return c.json({ error: 'PASSWORD is not configured on the backend. Please set PASSWORD in Worker secrets.' }, 401);
  }

  if (!input || input !== required) {
    return c.json({ error: 'Incorrect password' }, 401);
  }

  const token = await sign(
    { authenticated: true, iat: Math.floor(Date.now() / 1000) },
    getJwtSecret(c)
  );

  return c.json({
    success: true,
    token,
    authenticated: true,
  });
};

authRouter.post('/login', handleLogin);

const handleMe = async (c: any) => {
  const isAuth = await verifyAuth(c);
  const required = getPassword(c);

  if (!isAuth) {
    return c.json({ authenticated: false, passwordProtected: !!required }, 401);
  }

  return c.json({ authenticated: true, passwordProtected: !!required });
};

// We will mount this on /api/auth, but some might expect /me or /api/me.
// The instructions said "Extract the auth endpoints (/auth/login, /me, /auth/status) into auth.ts".
// Let's just define the routes on the router. 
authRouter.get('/me', handleMe);

const handleAuthStatus = (c: any) => {
  const required = getPassword(c);
  return c.json({
    configured: Boolean(required),
    error: required ? undefined : 'PASSWORD environment variable is not configured on the server.',
  });
};

authRouter.get('/status', handleAuthStatus);
