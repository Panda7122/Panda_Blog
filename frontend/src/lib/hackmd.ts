/**
 * 支援 HackMD 風格的 Markdown 擴充語法：
 *
 * :::info / :::success / :::warning / :::danger   → 彩色提示框
 * :::spoiler 標題                                  → 可摺疊區塊
 * [TOC]                                            → 自動目錄（h1–h3）
 *
 * 另外在後台預覽時替每個區塊標上原始碼行號（data-line），讓編輯器和預覽能同步捲動。
 */
import type { Paragraph, Parent as MdParent, PhrasingContent, Root as MdRoot, RootContent } from 'mdast';
import type { ContainerDirective, LeafDirective, TextDirective } from 'mdast-util-directive';
import type { Element, ElementContent, Root as HRoot } from 'hast';

export const BOX_KINDS = ['info', 'success', 'warning', 'danger'] as const;

/** HackMD 的 `:::spoiler 標題` 轉成 remark-directive 的 `:::spoiler[標題]`（不改變行數） */
export function preprocessHackmd(src: string): string {
  let fence: { ch: string; len: number } | null = null;
  return src
    .split('\n')
    .map((line) => {
      const f = /^\s{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (f) {
        const ch = f[1][0];
        if (!fence) fence = { ch, len: f[1].length };
        else if (ch === fence.ch && f[1].length >= fence.len && !f[2].trim()) fence = null;
        return line;
      }
      if (fence) return line;
      const m = /^(\s*):::\s*(info|success|warning|danger|spoiler)\s+([^[{].*?)\s*$/.exec(line);
      return m ? `${m[1]}:::${m[2]}[${m[3].replace(/[[\]]/g, '\\$&')}]` : line;
    })
    .join('\n');
}

type Directive = ContainerDirective | LeafDirective | TextDirective;

function plainText(nodes: readonly { type: string; value?: string; children?: unknown[] }[]): string {
  return nodes
    .map((n) => (typeof n.value === 'string' ? n.value : n.children ? plainText(n.children as never) : ''))
    .join('');
}

/** 不是我們支援的 directive（例如內文的「key:value」被誤判成 :value）就還原成原本的文字 */
function directiveSource(d: Directive): string {
  const marks = d.type === 'textDirective' ? ':' : d.type === 'leafDirective' ? '::' : ':::';
  const label = d.children.length ? `[${plainText(d.children as never)}]` : '';
  const attrs = Object.entries(d.attributes ?? {});
  const attrText = attrs.length ? `{${attrs.map(([k, v]) => (v ? `${k}="${v}"` : k)).join(' ')}}` : '';
  return `${marks}${d.name}${label}${attrText}`;
}

function isLabel(n: RootContent | undefined): n is Paragraph {
  return n?.type === 'paragraph' && !!(n.data as { directiveLabel?: boolean } | undefined)?.directiveLabel;
}

function transformContainer(d: ContainerDirective): RootContent {
  const label = isLabel(d.children[0]) ? (d.children[0] as Paragraph) : undefined;

  if ((BOX_KINDS as readonly string[]).includes(d.name)) {
    d.data = { hName: 'div', hProperties: { className: ['hk-box', `hk-${d.name}`] } };
    if (label) label.data = { ...label.data, hName: 'p', hProperties: { className: ['hk-box-title'] } };
    return d;
  }
  if (d.name === 'spoiler') {
    d.data = { hName: 'details', hProperties: { className: ['hk-spoiler'] } };
    if (label) label.data = { ...label.data, hName: 'summary' };
    else d.children.unshift({ type: 'paragraph', data: { hName: 'summary' }, children: [{ type: 'text', value: '點擊展開' }] });
    return d;
  }
  // 不認識的容器：保留內容，外框用一般 div
  d.data = { hName: 'div' };
  return d;
}

function walk(node: MdParent) {
  node.children = (node.children as RootContent[]).map((child): RootContent => {
    if ('children' in child) walk(child as MdParent);
    if (child.type === 'containerDirective') return transformContainer(child);
    if (child.type === 'leafDirective') {
      return { type: 'paragraph', children: [{ type: 'text', value: directiveSource(child) }], position: child.position };
    }
    if (child.type === 'textDirective') {
      return { type: 'text', value: directiveSource(child), position: child.position } as PhrasingContent;
    }
    return child;
  }) as never;
  // 還原後的 directive 會跟旁邊的文字分成好幾段（例如 :smile: 變成「:smile」「:」），合併回一段
  const merged: RootContent[] = [];
  for (const child of node.children as RootContent[]) {
    const prev = merged[merged.length - 1];
    if (prev?.type === 'text' && child.type === 'text') {
      merged[merged.length - 1] = {
        ...prev,
        value: prev.value + child.value,
        position: prev.position && child.position ? { start: prev.position.start, end: child.position.end } : undefined,
      };
    } else merged.push(child);
  }
  node.children = merged as never;
}

/** 接在 remark-directive 後面 */
export function remarkHackmd() {
  return (tree: MdRoot) => walk(tree);
}

function hastText(n: ElementContent): string {
  if (n.type === 'text') return n.value;
  if ('children' in n) return n.children.map(hastText).join('');
  return '';
}

/** 把單獨一段的 [TOC] 換成目錄，要放在 rehype-slug 後面 */
export function rehypeToc() {
  return (tree: HRoot) => {
    const headings: { level: number; id: string; text: string }[] = [];
    const collect = (nodes: ElementContent[] | HRoot['children']) => {
      for (const n of nodes) {
        if (n.type !== 'element') continue;
        const m = /^h([1-3])$/.exec(n.tagName);
        if (m && n.properties?.id) headings.push({ level: +m[1], id: String(n.properties.id), text: hastText(n) });
        else collect(n.children);
      }
    };
    collect(tree.children);
    if (!headings.length) return;
    const top = Math.min(...headings.map((h) => h.level));

    const replace = (nodes: (ElementContent | HRoot['children'][number])[]) => {
      nodes.forEach((n, i) => {
        if (n.type !== 'element') return;
        if (n.tagName === 'p' && hastText(n).trim().toUpperCase() === '[TOC]') {
          const toc: Element = {
            type: 'element',
            tagName: 'nav',
            properties: { className: ['toc'], dataLine: n.properties?.dataLine },
            children: [
              { type: 'element', tagName: 'p', properties: { className: ['toc-title'] }, children: [{ type: 'text', value: '目錄' }] },
              {
                type: 'element',
                tagName: 'ul',
                properties: {},
                children: headings.map((h) => ({
                  type: 'element',
                  tagName: 'li',
                  properties: { className: [`toc-l${h.level - top}`] },
                  children: [{ type: 'element', tagName: 'a', properties: { href: `#${h.id}` }, children: [{ type: 'text', value: h.text }] }],
                })),
              },
            ],
            position: n.position,
          };
          nodes[i] = toc;
        } else replace(n.children);
      });
    };
    replace(tree.children);
  };
}

/** 後台預覽用：每個最外層區塊標上它在原始碼的起始行號 */
export function rehypeSourceLines() {
  return (tree: HRoot) => {
    for (const n of tree.children) {
      if (n.type === 'element' && n.position) n.properties = { ...n.properties, dataLine: n.position.start.line };
    }
  };
}
