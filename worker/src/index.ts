/**
 * 碎心日記的後端：GitHub OAuth 換 token，以及按讚 / 匿名留言 API（見 interact.ts）。
 *
 * GET /login?origin=<前端 origin>  → 導向 GitHub 授權頁
 * GET /callback?code&state         → 用 client secret 換 access token，
 *                                     確認是站長帳號後用 postMessage 傳回前端視窗
 * /api/*                           → 按讚與留言
 */
import { handleApi } from './interact';

export interface Env {
  DB: D1Database;
  IP_SALT?: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_USER: string;
  ALLOWED_ORIGINS: string;
  OAUTH_SCOPE?: string;
}

const COOKIE = 'record_blog_oauth';

function allowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
}

function readCookie(req: Request): { state: string; origin: string } | null {
  const raw = req.headers.get('Cookie') ?? '';
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(raw);
  if (!m) return null;
  try {
    return JSON.parse(atob(decodeURIComponent(m[1])));
  } catch {
    return null;
  }
}

/** 回傳一個會把結果 postMessage 給 opener 並自動關閉的頁面 */
function resultPage(origin: string, payload: { token?: string; error?: string }, clearCookie = true): Response {
  const data = JSON.stringify({ type: 'record-blog-oauth', ...payload }).replace(/</g, '\\u003c');
  const target = JSON.stringify(origin).replace(/</g, '\\u003c');
  const html = `<!doctype html><meta charset="utf-8"><title>登入中…</title>
<body style="font-family:system-ui;background:#f7f3ff;color:#4a3185;display:grid;place-items:center;height:100vh;margin:0">
<p>${payload.error ? '登入失敗：' + payload.error.replace(/[<>&]/g, '') : '登入成功，視窗即將關閉…'}</p>
<script>
  if (window.opener) { window.opener.postMessage(${data}, ${target}); setTimeout(() => window.close(), 300); }
</script></body>`;
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  if (clearCookie) headers.append('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  return new Response(html, { headers });
}

async function handleLogin(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const origin = (url.searchParams.get('origin') ?? '').replace(/\/$/, '');
  if (!allowedOrigins(env).includes(origin)) {
    return new Response(`Origin not allowed: ${origin}`, { status: 403 });
  }
  const state = crypto.randomUUID();
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', `${url.origin}/callback`);
  authorize.searchParams.set('scope', env.OAUTH_SCOPE || 'public_repo');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('login', env.ALLOWED_USER);
  authorize.searchParams.set('allow_signup', 'false');

  const cookie = encodeURIComponent(btoa(JSON.stringify({ state, origin })));
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      'Set-Cookie': `${COOKIE}=${cookie}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}

async function handleCallback(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const saved = readCookie(req);
  if (!saved || !allowedOrigins(env).includes(saved.origin)) {
    return new Response('登入工作階段已過期，請重新登入', { status: 400 });
  }
  const fail = (error: string) => resultPage(saved.origin, { error });

  if (url.searchParams.get('state') !== saved.state) return fail('state 驗證失敗');
  const code = url.searchParams.get('code');
  if (!code) return fail(url.searchParams.get('error_description') ?? '未取得授權碼');

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/callback`,
    }),
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error_description?: string };
  if (!tokenJson.access_token) return fail(tokenJson.error_description ?? '無法取得 access token');

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'record-blog-oauth',
    },
  });
  const user = (await userRes.json()) as { login?: string };
  if (!user.login || user.login.toLowerCase() !== env.ALLOWED_USER.toLowerCase()) {
    return fail(`帳號 ${user.login ?? '?'} 沒有權限登入這個部落格`);
  }

  return resultPage(saved.origin, { token: tokenJson.access_token });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(req.url);
    if (pathname === '/login') return handleLogin(req, env);
    if (pathname === '/callback') return handleCallback(req, env);
    if (pathname.startsWith('/api/')) return handleApi(req, env);
    return new Response('Blog OAuth worker is running.', { headers: { 'Content-Type': 'text/plain' } });
  },
};
