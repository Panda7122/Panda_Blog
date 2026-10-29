import { config } from '../config';

const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function gh<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = (await res.json()).message ?? msg;
    } catch {
      /* ignore */
    }
    if (res.status === 403 && /not accessible by (personal access|integration)/i.test(msg)) {
      msg += `（token 權限不足：請到 GitHub token 設定，確認有選 ${config.owner}/${config.repo}，且 Contents 為 Read and write）`;
    }
    throw new GitHubError(res.status, `GitHub API ${res.status}: ${msg}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const repoPath = () => `/repos/${config.owner}/${config.repo}`;
const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export const getUser = (token: string) => gh<GitHubUser>(token, '/user');

export const getRepo = (token: string) =>
  gh<{ permissions?: { push: boolean } }>(token, repoPath());

export interface TreeEntry {
  path: string;
  sha: string;
  type: 'blob' | 'tree';
}

/** 直接從 repo 讀取目前所有文章檔（包含尚未部署完成的） */
export async function listPostFiles(token: string): Promise<TreeEntry[]> {
  const res = await gh<{ tree: TreeEntry[] }>(
    token,
    `${repoPath()}/git/trees/${encodeURIComponent(config.branch)}?recursive=1`,
  );
  return res.tree.filter(
    (t) => t.type === 'blob' && t.path.startsWith(config.postsDir + '/') && t.path.endsWith('.md'),
  );
}

export function utf8ToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function base64ToUtf8(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function getFile(token: string, path: string): Promise<{ text: string; sha: string }> {
  const res = await gh<{ content: string; sha: string }>(
    token,
    `${repoPath()}/contents/${encodePath(path)}?ref=${encodeURIComponent(config.branch)}`,
  );
  return { text: base64ToUtf8(res.content), sha: res.sha };
}

/** 建立或更新檔案（= 一個 commit） */
export async function putFile(
  token: string,
  path: string,
  base64Content: string,
  message: string,
  sha?: string,
): Promise<{ sha: string }> {
  const res = await gh<{ content: { sha: string } }>(token, `${repoPath()}/contents/${encodePath(path)}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: base64Content, branch: config.branch, sha }),
  });
  return { sha: res.content.sha };
}

export async function deleteFile(token: string, path: string, sha: string, message: string) {
  await gh(token, `${repoPath()}/contents/${encodePath(path)}`, {
    method: 'DELETE',
    body: JSON.stringify({ message, sha, branch: config.branch }),
  });
}

export interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  head_commit: { message: string } | null;
  created_at: string;
}

export async function latestRun(token: string): Promise<WorkflowRun | undefined> {
  const res = await gh<{ workflow_runs: WorkflowRun[] }>(token, `${repoPath()}/actions/runs?per_page=1`);
  return res.workflow_runs[0];
}

/** 後台預覽用：尚未部署的媒體檔直接從 repo 讀 */
export const rawMediaUrl = (src: string) =>
  /^(https?:)?\/\//.test(src) || src.startsWith('data:') || src.startsWith('blob:')
    ? src
    : `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/content/public/${src.replace(/^\.?\//, '')}`;
