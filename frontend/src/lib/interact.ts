import { config } from '../config';

// 按讚與匿名留言，打到 worker/src/interact.ts

export interface Comment {
  id: number;
  post: string;
  name: string;
  body: string;
  created_at: number;
}

export interface PostInteractions {
  likes: number;
  liked: boolean;
  comments: Comment[];
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(config.apiUrl + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `伺服器錯誤（${res.status}）`);
  return data as T;
}

// 每個瀏覽器一個隨機 ID，用來記住按過哪些讚
let memoVisitor: string | undefined;
function visitorId(): string {
  if (memoVisitor) return memoVisitor;
  const KEY = 'panda-blog:visitor';
  try {
    memoVisitor = localStorage.getItem(KEY) ?? undefined;
    if (!memoVisitor) localStorage.setItem(KEY, (memoVisitor = crypto.randomUUID()));
  } catch {
    memoVisitor = crypto.randomUUID();
  }
  return memoVisitor;
}

export const getInteractions = (post: string) =>
  api<PostInteractions>(`/api/post?post=${encodeURIComponent(post)}&visitor=${visitorId()}`);

export const toggleLike = (post: string) =>
  api<{ likes: number; liked: boolean }>('/api/like', {
    method: 'POST',
    body: JSON.stringify({ post, visitor: visitorId() }),
  });

export const addComment = (post: string, name: string, body: string, website: string) =>
  api<{ comment: Comment }>('/api/comments', { method: 'POST', body: JSON.stringify({ post, name, body, website }) });

export const recentComments = () => api<{ comments: Comment[] }>('/api/comments/recent');

export const deleteComment = (token: string, id: number) =>
  api<{ ok: true }>(`/api/comments/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });

export const formatCommentTime = (ts: number) =>
  new Date(ts).toLocaleString('zh-TW', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
