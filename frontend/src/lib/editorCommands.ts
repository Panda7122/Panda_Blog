import { EditorSelection, type ChangeSpec } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

// 編輯器工具列與快捷鍵用的格式化指令

/** 用 before / after 包住選取文字；沒選取時插入 placeholder 並選起來方便直接改 */
export function wrapSelection(view: EditorView, before: string, after = '', placeholder = '') {
  const tr = view.state.changeByRange((range) => {
    const text = view.state.sliceDoc(range.from, range.to) || placeholder;
    const start = range.from + before.length;
    return {
      changes: { from: range.from, to: range.to, insert: before + text + after },
      range: EditorSelection.range(start, start + text.length),
    };
  });
  view.dispatch(view.state.update(tr, { scrollIntoView: true, userEvent: 'input' }));
  view.focus();
}

/**
 * 在選取範圍的每一行前面加上前綴（標題、清單、引用）；
 * 如果每一行都已經有了（符合 detect），就改成移除，達到切換效果
 */
export function toggleLinePrefix(view: EditorView, make: (index: number) => string, detect: RegExp) {
  const { state } = view;
  const lines = new Set<number>();
  for (const r of state.selection.ranges) {
    const last = state.doc.lineAt(r.to).number;
    for (let n = state.doc.lineAt(r.from).number; n <= last; n++) lines.add(n);
  }
  const sorted = [...lines].sort((a, b) => a - b).map((n) => state.doc.line(n));
  const allHave = sorted.every((l) => detect.test(l.text));
  const changes: ChangeSpec[] = sorted.map((l, i) => {
    const m = detect.exec(l.text);
    if (allHave && m) return { from: l.from, to: l.from + m[0].length, insert: '' };
    // 換成新的前綴（例如把「- 」改成「1. 」）
    return { from: l.from, to: l.from + (m ? m[0].length : 0), insert: make(i) };
  });
  view.dispatch({ changes, scrollIntoView: true, userEvent: 'input' });
  view.focus();
}

/** 把文字放成獨立的區塊（前後空一行），游標停在 cursorOffset（預設是區塊結尾） */
export function insertBlock(view: EditorView, text: string, cursorOffset = text.length) {
  const { state } = view;
  const sel = state.selection.main;
  const line = state.doc.lineAt(sel.to);
  const atEmptyLine = !line.text.trim();
  const from = atEmptyLine ? line.from : line.to;
  const to = atEmptyLine ? line.to : line.to;
  const before = atEmptyLine ? (line.number > 1 && state.doc.line(line.number - 1).text.trim() ? '\n' : '') : '\n\n';
  const insert = `${before}${text}\n`;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + before.length + cursorOffset },
    scrollIntoView: true,
    userEvent: 'input',
  });
  view.focus();
}

/** 用 :::info / ::: 這種圍欄包住選取的文字；沒選取就插入範例內容並選起來 */
export function wrapContainer(view: EditorView, open: string, close: string, placeholder: string) {
  const sel = view.state.selection.main;
  const selected = view.state.sliceDoc(sel.from, sel.to);
  if (selected) {
    const line = view.state.doc.lineAt(sel.from);
    const lead = sel.from === line.from ? '' : '\n';
    const insert = `${lead}${open}\n${selected.replace(/\n$/, '')}\n${close}\n`;
    view.dispatch({ changes: { from: sel.from, to: sel.to, insert }, scrollIntoView: true, userEvent: 'input' });
    view.focus();
    return;
  }
  const text = `${open}\n${placeholder}\n${close}`;
  insertBlock(view, text, open.length + 1);
  const start = view.state.selection.main.head;
  view.dispatch({ selection: { anchor: start, head: start + placeholder.length } });
}

/** 把編輯器裡的某段暫時文字（例如上傳中的佔位符）換成最終內容 */
export function replaceText(view: EditorView, search: string, insert: string): boolean {
  const at = view.state.doc.toString().indexOf(search);
  if (at < 0) return false;
  view.dispatch({ changes: { from: at, to: at + search.length, insert }, userEvent: 'input' });
  return true;
}
