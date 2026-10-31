/**
 * 按讚與匿名留言 API（資料存在 Cloudflare D1）
 *
 * GET    /api/post?post=<路徑>&visitor=<id> → { likes, liked, comments }
 * POST   /api/like     { post, visitor }    → 切換按讚，回傳 { likes, liked }
 * POST   /api/comments { post, name, body, website } → 新增匿名留言
 * GET    /api/comments/recent       → 全站最新留言（後台管理用）
 * DELETE /api/comments/<id>         → 刪除留言，需帶站長的 GitHub token
 */
import type { Env } from './index';

export interface Comment {
  id: number;
  post: string;
  name: string;
  body: string;
  created_at: number;
}

const MAX_NAME = 30;
const MAX_BODY = 1000;
const COMMENT_INTERVAL_MS = 20_000;
const COMMENTS_PER_DAY = 30;
// 同一個 IP 對同一篇文章最多算幾個讚（防止清 localStorage 狂按）
const LIKES_PER_IP = 30;
const POST_RE = /^[\w\-一-鿿]+(\/[\w\-一-鿿]+){1,3}$/;

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim().replace(/\/$/, ''));
  if (!allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function ipHash(req: Request, env: Env): Promise<string> {
  const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown';
  const data = new TextEncoder().encode(`${env.IP_SALT ?? 'panda-blog'}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function checkPost(post: unknown): string {
  if (typeof post !== 'string' || post.length > 200 || !POST_RE.test(post)) {
    throw new HttpError(400, '文章路徑不正確');
  }
  return post;
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    throw new HttpError(400, '格式錯誤');
  }
}

function checkVisitor(visitor: unknown): string {
  if (typeof visitor !== 'string' || !/^[\w-]{8,64}$/.test(visitor)) throw new HttpError(400, '訪客 ID 不正確');
  return visitor;
}

const countLikes = async (env: Env, post: string) =>
  (await env.DB.prepare('SELECT COUNT(*) AS n FROM likes WHERE post = ?').bind(post).first<{ n: number }>())?.n ?? 0;

async function getPost(req: Request, env: Env) {
  const params = new URL(req.url).searchParams;
  const post = checkPost(params.get('post'));
  const visitor = params.get('visitor');
  const [likes, liked, comments] = await Promise.all([
    countLikes(env, post),
    visitor ? env.DB.prepare('SELECT 1 FROM likes WHERE post = ? AND visitor = ?').bind(post, visitor).first() : null,
    env.DB.prepare('SELECT id, post, name, body, created_at FROM comments WHERE post = ? ORDER BY created_at ASC')
      .bind(post)
      .all<Comment>(),
  ]);
  return { likes, liked: !!liked, comments: comments.results };
}

async function toggleLike(req: Request, env: Env) {
  const input = await readJson(req);
  const post = checkPost(input.post);
  const visitor = checkVisitor(input.visitor);
  const del = await env.DB.prepare('DELETE FROM likes WHERE post = ? AND visitor = ?').bind(post, visitor).run();
  const liked = del.meta.changes === 0;
  if (liked) {
    const hash = await ipHash(req, env);
    const fromIp = await env.DB.prepare('SELECT COUNT(*) AS n FROM likes WHERE post = ? AND ip_hash = ?')
      .bind(post, hash)
      .first<{ n: number }>();
    if ((fromIp?.n ?? 0) >= LIKES_PER_IP) throw new HttpError(429, '這個網路按讚次數太多了');
    await env.DB.prepare('INSERT OR IGNORE INTO likes (post, visitor, ip_hash, created_at) VALUES (?, ?, ?, ?)')
      .bind(post, visitor, hash, Date.now())
      .run();
  }
  return { likes: await countLikes(env, post), liked };
}

async function addComment(req: Request, env: Env) {
  const input = await readJson(req);
  // 蜜罐欄位：真人看不到，機器人才會填
  if (input.website) throw new HttpError(400, '留言失敗');
  const post = checkPost(input.post);
  const name = String(input.name ?? '').trim().slice(0, MAX_NAME) || '匿名';
  const body = String(input.body ?? '').trim();
  if (!body) throw new HttpError(400, '留言內容不能是空的');
  if (body.length > MAX_BODY) throw new HttpError(400, `留言最多 ${MAX_BODY} 字`);

  const hash = await ipHash(req, env);
  const now = Date.now();
  const recent = await env.DB.prepare(
    'SELECT COUNT(*) AS n, MAX(created_at) AS last FROM comments WHERE ip_hash = ? AND created_at > ?',
  )
    .bind(hash, now - 86_400_000)
    .first<{ n: number; last: number | null }>();
  if (recent?.last && now - recent.last < COMMENT_INTERVAL_MS) throw new HttpError(429, '留言太快了，稍等一下再試');
  if ((recent?.n ?? 0) >= COMMENTS_PER_DAY) throw new HttpError(429, '今天留言次數已達上限');

  const row = await env.DB.prepare(
    'INSERT INTO comments (post, name, body, ip_hash, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id, post, name, body, created_at',
  )
    .bind(post, name, body, hash, now)
    .first<Comment>();
  return { comment: row };
}

async function recentComments(env: Env) {
  const rows = await env.DB.prepare(
    'SELECT id, post, name, body, created_at FROM comments ORDER BY created_at DESC LIMIT 50',
  ).all<Comment>();
  return { comments: rows.results };
}

async function requireAdmin(req: Request, env: Env) {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) throw new HttpError(401, '需要站長登入');
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: auth, Accept: 'application/vnd.github+json', 'User-Agent': 'record-blog-oauth' },
  });
  const user = (await res.json()) as { login?: string };
  if (!res.ok || user.login?.toLowerCase() !== env.ALLOWED_USER.toLowerCase()) {
    throw new HttpError(403, '只有站長可以刪除留言');
  }
}

async function deleteComment(req: Request, env: Env, id: number) {
  await requireAdmin(req, env);
  await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
  return { ok: true };
}

export async function handleApi(req: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(req, env);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const { pathname } = new URL(req.url);
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });

  try {
    const del = /^\/api\/comments\/(\d+)$/.exec(pathname);
    if (req.method === 'GET' && pathname === '/api/post') return json(await getPost(req, env));
    if (req.method === 'POST' && pathname === '/api/like') return json(await toggleLike(req, env));
    if (req.method === 'POST' && pathname === '/api/comments') return json(await addComment(req, env), 201);
    if (req.method === 'GET' && pathname === '/api/comments/recent') return json(await recentComments(env));
    if (req.method === 'DELETE' && del) return json(await deleteComment(req, env, Number(del[1])));
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: '伺服器錯誤' }, 500);
  }
}
