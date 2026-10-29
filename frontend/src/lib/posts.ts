import { config } from '../config';
import { parseFrontmatter, type PostMeta } from './frontmatter';

export interface Post extends PostMeta {
  /** 分類路徑，例如 "sport/badminton" */
  category: string;
  slug: string;
  /** repo 內的檔案路徑，例如 "content/posts/music/xxx.md" */
  file: string;
  body: string;
  excerpt: string;
  readingMinutes: number;
}

// build 時把所有文章打包進網站
const files = import.meta.glob('../../../content/posts/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function makeExcerpt(body: string): string {
  const plain = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 110 ? plain.slice(0, 110) + '…' : plain;
}

export function toPost(file: string, raw: string): Post {
  const rel = file.slice(file.indexOf(config.postsDir) + config.postsDir.length + 1);
  const parts = rel.replace(/\.md$/, '').split('/');
  const slug = parts.pop()!;
  const { meta, body } = parseFrontmatter(raw);
  return {
    ...meta,
    title: meta.title || slug,
    category: parts.join('/'),
    slug,
    file: `${config.postsDir}/${rel}`,
    body,
    excerpt: meta.summary || makeExcerpt(body),
    readingMinutes: Math.max(1, Math.round(body.length / 400)),
  };
}

export const allPosts: Post[] = Object.entries(files)
  .map(([file, raw]) => toPost(file, raw))
  .filter((p) => !p.draft)
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));

export function postsIn(categoryPath: string): Post[] {
  return allPosts.filter((p) => p.category === categoryPath || p.category.startsWith(categoryPath + '/'));
}

export function findPost(categoryPath: string, slug: string): Post | undefined {
  return allPosts.find((p) => p.category === categoryPath && p.slug === slug);
}

export const postUrl = (p: Pick<Post, 'category' | 'slug'>) => `/post/${p.category}/${p.slug}`;
