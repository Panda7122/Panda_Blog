/**
 * Emoji 簡碼（:smile: → 😄），名稱跟 GitHub / HackMD 一樣（gemoji）。
 *
 * 表格約 1800 筆，只在文章裡真的出現 :xxx: 時才動態載入，一般文章不會多下載。
 */
import type { Parent, Root, RootContent, Text } from 'mdast';

export interface EmojiEntry {
  name: string;
  emoji: string;
  /** 搜尋用：其他名稱、標籤、英文描述 */
  keywords: string;
}

/** 可能是簡碼的樣子（真正有沒有這個 emoji 要查表） */
export const SHORTCODE_RE = /:([a-z0-9_+-]+):/g;

let table: Map<string, string> | null = null;
let entries: EmojiEntry[] = [];
let loading: Promise<Map<string, string>> | null = null;

export function emojiTable(): Map<string, string> | null {
  return table;
}

export function loadEmoji(): Promise<Map<string, string>> {
  loading ??= import('gemoji').then(({ gemoji }) => {
    const map = new Map<string, string>();
    const list: EmojiEntry[] = [];
    for (const g of gemoji) {
      const keywords = [...g.names, ...g.tags, g.description].join(' ').toLowerCase();
      for (const name of g.names) {
        map.set(name, g.emoji);
        list.push({ name, emoji: g.emoji, keywords });
      }
    }
    table = map;
    entries = list;
    return map;
  });
  return loading;
}

export async function emojiEntries(): Promise<EmojiEntry[]> {
  await loadEmoji();
  return entries;
}

/** 原始碼裡有沒有可能是簡碼的東西（用來決定要不要載入表格） */
export function mayHaveShortcode(src: string): boolean {
  SHORTCODE_RE.lastIndex = 0;
  return SHORTCODE_RE.test(src);
}

function replaceIn(node: Parent, map: Map<string, string>) {
  node.children = (node.children as RootContent[]).map((child) => {
    if (child.type === 'text') {
      const value = child.value.replace(SHORTCODE_RE, (m, name: string) => map.get(name) ?? m);
      return value === child.value ? child : ({ ...child, value } as Text);
    }
    // 行內程式碼、程式碼區塊、數學式不是 text，不會被換掉
    if ('children' in child) replaceIn(child as Parent, map);
    return child;
  }) as never;
}

/** 要放在 remarkHackmd 後面（它會把被誤判成 directive 的 :smile 還原成文字） */
export function remarkEmoji(options: { table: Map<string, string> | null }) {
  return (tree: Root) => {
    if (options.table) replaceIn(tree, options.table);
  };
}
