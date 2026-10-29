export interface PostMeta {
  title: string;
  date: string;
  tags: string[];
  summary: string;
  cover: string;
  draft: boolean;
  /** 置頂：首頁與分類頁都排在最前面 */
  pinned: boolean;
}

export const emptyMeta = (): PostMeta => ({
  title: '',
  date: new Date().toISOString().slice(0, 10),
  tags: [],
  summary: '',
  cover: '',
  draft: false,
  pinned: false,
});

function parseValue(v: string): unknown {
  const s = v.trim();
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s.startsWith('"') || s.startsWith('[')) {
    try {
      return JSON.parse(s);
    } catch {
      /* 落到下面的寬鬆解析 */
    }
  }
  if (s.startsWith('[') && s.endsWith(']')) {
    return s
      .slice(1, -1)
      .split(',')
      .map((x) => x.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }
  return s.replace(/^'(.*)'$/, '$1');
}

/** 解析 Markdown 開頭的 --- frontmatter ---（支援簡單的 key: value 與 [陣列]） */
export function parseFrontmatter(raw: string): { meta: PostMeta; body: string } {
  const text = raw.replace(/\r\n/g, '\n');
  const meta = emptyMeta();
  meta.date = '';
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return { meta, body: text };

  const data: Record<string, unknown> = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (kv) data[kv[1]] = parseValue(kv[2]);
  }
  if (typeof data.title === 'string') meta.title = data.title;
  if (data.date != null) meta.date = String(data.date);
  if (Array.isArray(data.tags)) meta.tags = data.tags.map(String);
  else if (typeof data.tags === 'string' && data.tags) meta.tags = data.tags.split(',').map((t) => t.trim());
  if (typeof data.summary === 'string') meta.summary = data.summary;
  if (typeof data.cover === 'string') meta.cover = data.cover;
  meta.draft = data.draft === true;
  meta.pinned = data.pinned === true;
  return { meta, body: text.slice(m[0].length) };
}

export function stringifyPost(meta: PostMeta, body: string): string {
  const lines = [
    '---',
    `title: ${JSON.stringify(meta.title)}`,
    `date: ${meta.date}`,
    `tags: ${JSON.stringify(meta.tags)}`,
  ];
  if (meta.summary) lines.push(`summary: ${JSON.stringify(meta.summary)}`);
  if (meta.cover) lines.push(`cover: ${JSON.stringify(meta.cover)}`);
  if (meta.draft) lines.push('draft: true');
  if (meta.pinned) lines.push('pinned: true');
  lines.push('---', '');
  return lines.join('\n') + body.replace(/^\n+/, '') + (body.endsWith('\n') ? '' : '\n');
}
