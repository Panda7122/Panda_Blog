import type { PostMeta } from './frontmatter';

// 寫作中的暫存只放在這台裝置的 localStorage，不會 commit 到 GitHub；按「發布」才會推上去。

export interface DraftData {
  meta: PostMeta;
  tagsText: string;
  category: string;
  slug: string;
  body: string;
}

export interface Draft extends DraftData {
  /** 既有文章為 `file:<path>`，新文章為 `new-<時間戳>` */
  id: string;
  /** 對應的 repo 檔案（新文章則無） */
  file?: string;
  /** 暫存當下 GitHub 上那個檔案的 sha，用來偵測之後遠端是否被改過 */
  baseSha?: string;
  savedAt: number;
}

const KEY = 'panda-blog:drafts';

function readAll(): Record<string, Draft> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, Draft>): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

export const listDrafts = (): Draft[] => Object.values(readAll()).sort((a, b) => b.savedAt - a.savedAt);

export const loadDraft = (id: string): Draft | undefined => readAll()[id];

export const saveDraft = (d: Draft): boolean => writeAll({ ...readAll(), [d.id]: d });

export function removeDraft(id: string) {
  const all = readAll();
  delete all[id];
  writeAll(all);
}

export const formatSavedAt = (ts: number) =>
  new Date(ts).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
