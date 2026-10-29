export interface Category {
  slug: string;
  name: string;
  icon: string;
  description: string;
  children?: Category[];
}

export const categories: Category[] = [
  { slug: 'coffee', name: 'Coffee', icon: '☕', description: '豆子、器材與每一杯的筆記' },
  {
    slug: 'sport',
    name: 'Sport',
    icon: '🏸',
    description: '流汗的日子',
    children: [
      { slug: 'badminton', name: 'Badminton', icon: '🏸', description: '羽球技術與比賽心得' },
      { slug: 'other', name: 'Other', icon: '🏃', description: '其他運動' },
    ],
  },
  { slug: 'music', name: 'Music', icon: '🎵', description: '好聽的、讓我有感觸的音樂、練習紀錄' },
  {
    slug: 'computer-science',
    name: 'Computer Science',
    icon: '💻',
    description: '寫程式與做研究',
    children: [
      { slug: 'algorithm', name: 'Algorithm', icon: '🧮', description: '演算法與解題' },
      { slug: 'mir', name: 'MIR', icon: '🎼', description: 'Music Information Retrieval' },
      { slug: 'system', name: 'System', icon: '🖥️', description: '系統、架構與工具' },
    ],
  },
  { slug: 'drawing', name: 'Drawing', icon: '🎨', description: '塗鴉與作品' },
  { slug: 'game', name: 'Game', icon: '🎮', description: '遊戲紀錄與心得' },
  { slug: 'others', name: 'Others', icon: '🗂️', description: '其他雜記' },
];

export interface ResolvedCategory {
  path: string;
  category: Category;
  parent?: Category;
}

/** 依路徑（例如 "sport/badminton"）找出分類 */
export function findCategory(path: string): ResolvedCategory | undefined {
  const [first, second] = path.split('/');
  const top = categories.find((c) => c.slug === first);
  if (!top) return undefined;
  if (!second) return { path, category: top };
  const child = top.children?.find((c) => c.slug === second);
  return child ? { path, category: child, parent: top } : undefined;
}

export function categoryLabel(path: string): string {
  const r = findCategory(path);
  if (!r) return path;
  return r.parent ? `${r.parent.name} / ${r.category.name}` : r.category.name;
}

/** 可以發文的分類（沒有子分類的節點） */
export function leafCategories(): { path: string; label: string }[] {
  return categories.flatMap((c) =>
    c.children
      ? c.children.map((ch) => ({ path: `${c.slug}/${ch.slug}`, label: `${c.name} / ${ch.name}` }))
      : [{ path: c.slug, label: c.name }],
  );
}

export const isMusicCategory = (path: string) => path === 'music' || path.startsWith('music/');
