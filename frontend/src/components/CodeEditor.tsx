import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { autocompletion, completionKeymap, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { tags as t } from '@lezer/highlight';
import { wrapSelection } from '../lib/editorCommands';
import { emojiEntries } from '../lib/emoji';

// 後台用的 Markdown 編輯器（CodeMirror 6），配色跟網站的淡紫色一致

const lavenderHighlight = HighlightStyle.define([
  { tag: t.heading1, color: '#4a3185', fontWeight: '700', fontSize: '1.25em' },
  { tag: t.heading2, color: '#4a3185', fontWeight: '700', fontSize: '1.12em' },
  { tag: [t.heading3, t.heading4, t.heading5, t.heading6], color: '#4a3185', fontWeight: '700' },
  { tag: t.strong, fontWeight: '700', color: '#2d2442' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: '#74698c' },
  { tag: t.link, color: '#7f56d9' },
  { tag: t.url, color: '#9a72f0', textDecoration: 'underline' },
  { tag: t.quote, color: '#74698c', fontStyle: 'italic' },
  { tag: t.monospace, color: '#a8264a' },
  { tag: [t.processingInstruction, t.contentSeparator, t.labelName], color: '#b89af7' },
  { tag: t.list, color: '#6542b3' },
  // 程式碼區塊內的語法
  { tag: [t.keyword, t.modifier, t.operatorKeyword], color: '#7f56d9' },
  { tag: [t.string, t.special(t.string), t.regexp], color: '#2f9e6e' },
  { tag: [t.number, t.bool, t.null, t.atom], color: '#c98a1b' },
  { tag: [t.comment, t.meta], color: '#9b91b3', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#3b6fd6' },
  { tag: [t.typeName, t.className], color: '#b5487a' },
  { tag: t.propertyName, color: '#6542b3' },
]);

const lavenderTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '0.92rem', backgroundColor: '#fdfcff', color: '#2d2442' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: "var(--font-mono), 'Noto Sans TC', monospace", lineHeight: '1.75' },
  '.cm-content': { padding: '16px 0', caretColor: '#7f56d9' },
  '.cm-line': { padding: '0 16px 0 10px' },
  '.cm-gutters': { backgroundColor: '#faf7ff', color: '#c3b6e3', border: 'none', borderRight: '1px solid #efe8fd' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 14px', minWidth: '40px' },
  '.cm-activeLine': { backgroundColor: 'rgba(154, 114, 240, 0.06)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(154, 114, 240, 0.1)', color: '#6542b3' },
  '.cm-cursor': { borderLeftColor: '#7f56d9', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: '#e8ddff !important' },
  '.cm-selectionMatch': { backgroundColor: 'rgba(212, 193, 253, 0.45)' },
  '.cm-placeholder': { color: '#b3a8cc' },
  '.cm-panels': { backgroundColor: '#faf7ff', borderColor: '#e6dcfa' },
  '.cm-searchMatch': { backgroundColor: 'rgba(201, 138, 27, 0.25)' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'rgba(201, 138, 27, 0.5)' },
  '.cm-tooltip': { border: '1px solid #e6dcfa', borderRadius: '10px', backgroundColor: '#fff', overflow: 'hidden' },
  '.cm-tooltip-autocomplete > ul': { fontFamily: 'inherit', maxHeight: '16em' },
  '.cm-tooltip-autocomplete > ul > li': { padding: '3px 12px !important' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#efe8fd', color: '#4a3185' },
});

const formatKeymap = keymap.of([
  { key: 'Mod-b', run: (v) => (wrapSelection(v, '**', '**', '粗體'), true) },
  { key: 'Mod-i', run: (v) => (wrapSelection(v, '*', '*', '斜體'), true) },
  { key: 'Mod-k', run: (v) => (wrapSelection(v, '[', '](https://)', '連結文字'), true) },
  { key: 'Mod-Shift-x', run: (v) => (wrapSelection(v, '~~', '~~', '刪除線'), true) },
]);

// 打「:」加兩個字以上跳出 emoji 建議（跟 HackMD 一樣），可用名稱或英文關鍵字搜尋
async function emojiCompletion(ctx: CompletionContext): Promise<CompletionResult | null> {
  const m = ctx.matchBefore(/(?:^|[^\w:]):[a-z0-9_+-]{2,}$/i);
  if (!m) return null;
  const from = m.from + m.text.indexOf(':');
  const q = m.text.slice(m.text.indexOf(':') + 1).toLowerCase();
  const list = await emojiEntries();
  if (ctx.aborted) return null;
  const rank = (e: (typeof list)[number]) =>
    e.name === q ? 0 : e.name.startsWith(q) ? 1 : e.name.includes(q) ? 2 : e.keywords.includes(q) ? 3 : -1;
  const hits = list
    .map((e) => ({ e, r: rank(e) }))
    .filter((h) => h.r >= 0)
    .sort((a, b) => a.r - b.r || a.e.name.length - b.e.name.length)
    .slice(0, 40);
  if (!hits.length) return null;
  return {
    from,
    filter: false,
    options: hits.map(({ e }) => ({ label: `:${e.name}:`, displayLabel: `${e.emoji}  ${e.name}`, type: 'text' })),
  };
}

export interface CursorInfo {
  line: number;
  col: number;
}

export function CodeEditor({
  value,
  onChange,
  onReady,
  onCursor,
  onFiles,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onReady?: (view: EditorView | null) => void;
  onCursor?: (c: CursorInfo) => void;
  /** 貼上或拖曳檔案進編輯器時呼叫；pos 是拖放位置（貼上時為 null，插在游標處） */
  onFiles?: (files: File[], pos: number | null) => void;
  placeholder?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // 回呼用 ref 保存，避免每次 render 重建編輯器
  const cb = useRef({ onChange, onCursor, onFiles });
  cb.current = { onChange, onCursor, onFiles };

  useEffect(() => {
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          dropCursor(),
          indentOnInput(),
          bracketMatching(),
          highlightSelectionMatches(),
          search({ top: true }),
          EditorView.lineWrapping,
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          syntaxHighlighting(lavenderHighlight),
          lavenderTheme,
          cmPlaceholder(placeholder ?? ''),
          autocompletion({ override: [emojiCompletion], icons: false }),
          formatKeymap,
          keymap.of([...completionKeymap, ...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) cb.current.onChange(u.state.doc.toString());
            if (u.docChanged || u.selectionSet) {
              const head = u.state.selection.main.head;
              const line = u.state.doc.lineAt(head);
              cb.current.onCursor?.({ line: line.number, col: head - line.from + 1 });
            }
          }),
          EditorView.domEventHandlers({
            paste(e) {
              const files = [...(e.clipboardData?.files ?? [])];
              if (!files.length || !cb.current.onFiles) return false;
              e.preventDefault();
              cb.current.onFiles(files, null);
              return true;
            },
            drop(e, v) {
              const files = [...(e.dataTransfer?.files ?? [])];
              if (!files.length || !cb.current.onFiles) return false;
              e.preventDefault();
              cb.current.onFiles(files, v.posAtCoords({ x: e.clientX, y: e.clientY }));
              return true;
            },
          }),
        ],
      }),
    });
    viewRef.current = view;
    onReady?.(view);
    return () => {
      onReady?.(null);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 外部改了內容（載入文章、還原暫存）才同步進編輯器；自己打字造成的變化不會走到這裡
  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={host} className="code-editor" />;
}
