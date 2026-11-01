import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { config } from '../../config';
import { useAuth } from '../../lib/auth';
import { isMusicCategory, leafCategories } from '../../lib/categories';
import { emptyMeta, parseFrontmatter, stringifyPost, type PostMeta } from '../../lib/frontmatter';
import { formatSavedAt, loadDraft, removeDraft, saveDraft, type Draft, type DraftData } from '../../lib/drafts';
import { deleteFile, fileToBase64, getFile, putFile, rawMediaUrl, utf8ToBase64 } from '../../lib/github';
import { Markdown } from '../../components/Markdown';
import { CodeEditor, type CursorInfo } from '../../components/CodeEditor';
import type { EditorView } from '@codemirror/view';
import { insertBlock, replaceText, toggleLinePrefix, wrapContainer, wrapSelection } from '../../lib/editorCommands';
import Login from './Login';

type View = 'split' | 'edit' | 'preview';

const MAX_UPLOAD_MB = 50;

function slugify(title: string): string {
  const ascii = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
  if (ascii.length >= 3) return ascii.slice(0, 60);
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `post-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

const blankData = (): DraftData => ({
  meta: emptyMeta(),
  tagsText: '',
  category: leafCategories()[0].path,
  slug: '',
  body: '',
});

const safeFileName = (name: string) => name.replace(/[^\w.\-一-鿿]+/g, '_');

function MusicDialog({
  onClose,
  onInsert,
  upload,
}: {
  onClose: () => void;
  onInsert: (block: string) => void;
  upload: (f: File) => Promise<string>;
}) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [src, setSrc] = useState('');
  const [cover, setCover] = useState('');
  const [busy, setBusy] = useState('');

  const pick = async (file: File | undefined, set: (s: string) => void, kind: string) => {
    if (!file) return;
    setBusy(`上傳${kind}中…`);
    try {
      set(await upload(file));
      if (kind === '音檔' && !title) setTitle(file.name.replace(/\.[^.]+$/, ''));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const insert = () => {
    const lines = ['```music'];
    if (title) lines.push(`title: ${title}`);
    if (artist) lines.push(`artist: ${artist}`);
    lines.push(`src: ${src}`);
    if (cover) lines.push(`cover: ${cover}`);
    lines.push('```');
    onInsert('\n' + lines.join('\n') + '\n');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>🎵 插入音樂</h3>
        <label>
          曲名
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          演出者
          <input value={artist} onChange={(e) => setArtist(e.target.value)} />
        </label>
        <label>
          音樂來源
          <input
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            placeholder="上傳音檔，或貼上 YouTube / Spotify / SoundCloud / mp3 網址"
          />
        </label>
        <label className="file-btn">
          上傳音檔（mp3 / wav / ogg / m4a / flac）
          <input type="file" accept="audio/*" onChange={(e) => pick(e.target.files?.[0], setSrc, '音檔')} />
        </label>
        <label>
          封面（選填，只用在音檔播放器）
          <input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="圖片網址" />
        </label>
        <label className="file-btn">
          上傳封面圖片
          <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0], setCover, '封面')} />
        </label>
        {busy && <p className="muted">{busy}</p>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={insert} disabled={!src || !!busy}>
            插入
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoDialog({
  onClose,
  onInsert,
  upload,
}: {
  onClose: () => void;
  onInsert: (block: string) => void;
  upload: (f: File) => Promise<string>;
}) {
  const [src, setSrc] = useState('');
  const [title, setTitle] = useState('');
  const [poster, setPoster] = useState('');
  const [busy, setBusy] = useState('');

  const pick = async (file: File | undefined, set: (s: string) => void, kind: string) => {
    if (!file) return;
    const mb = (file.size / 1024 / 1024).toFixed(1);
    setBusy(`上傳${kind}中（${mb}MB），檔案大的話要等一陣子…`);
    try {
      set(await upload(file));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const insert = () => {
    const lines = ['```video', `src: ${src}`];
    if (title) lines.push(`title: ${title}`);
    if (poster) lines.push(`poster: ${poster}`);
    lines.push('```');
    onInsert('\n' + lines.join('\n') + '\n');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>🎬 插入影片</h3>
        <label>
          影片來源
          <input value={src} onChange={(e) => setSrc(e.target.value)} placeholder="上傳影片，或貼上 YouTube / Vimeo 網址" />
        </label>
        <label className="file-btn">
          上傳影片（mp4 / webm / mov，{MAX_UPLOAD_MB}MB 以內）
          <input type="file" accept="video/*" onChange={(e) => pick(e.target.files?.[0], setSrc, '影片')} />
        </label>
        <p className="muted small-note">影片會直接存進 GitHub repo，長影片建議先傳到 YouTube 再貼網址。</p>
        <label>
          說明文字（選填，顯示在影片下方）
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          封面（選填，只用在上傳的影片）
          <input value={poster} onChange={(e) => setPoster(e.target.value)} placeholder="圖片網址" />
        </label>
        <label className="file-btn">
          上傳封面圖片
          <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0], setPoster, '封面')} />
        </label>
        {busy && <p className="muted">{busy}</p>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={insert} disabled={!src || !!busy}>
            插入
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Editor() {
  const { token, user, checking } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const file = params.get('file');
  const draftParam = params.get('draft');

  const [initial] = useState(blankData);
  const [meta, setMeta] = useState<PostMeta>(initial.meta);
  const [tagsText, setTagsText] = useState(initial.tagsText);
  const [category, setCategory] = useState(initial.category);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(false);
  const [body, setBody] = useState(initial.body);
  const [sha, setSha] = useState<string>();
  const [origPath, setOrigPath] = useState<string>();
  const [view, setView] = useState<View>('split');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [showMusic, setShowMusic] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const cmRef = useRef<EditorView | null>(null);
  const [cm, setCm] = useState<EditorView | null>(null);
  const [cursor, setCursor] = useState<CursorInfo>({ line: 1, col: 1 });
  const previewRef = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  // 本機暫存：既有文章用 file:<path>，新文章用 new-<時間戳>
  const [newId] = useState(() => `new-${Date.now().toString(36)}`);
  const draftId = file ? `file:${file}` : (draftParam ?? newId);
  const data = useMemo<DraftData>(() => ({ meta, tagsText, category, slug, body }), [meta, tagsText, category, slug, body]);
  const snapshot = useMemo(() => JSON.stringify(data), [data]);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [savedAt, setSavedAt] = useState<number>();
  const [pending, setPending] = useState<Draft | null>(null);
  const loadedDraft = useRef<string>();
  const dirty = snapshot !== baseline;

  const applyData = (d: DraftData) => {
    setMeta(d.meta);
    setTagsText(d.tagsText);
    setCategory(d.category);
    setSlug(d.slug);
    setSlugTouched(!!d.slug);
    setBody(d.body);
    setBaseline(JSON.stringify({ meta: d.meta, tagsText: d.tagsText, category: d.category, slug: d.slug, body: d.body }));
  };

  const applyDraft = (d: Draft) => {
    applyData(d);
    setSavedAt(d.savedAt);
    setPending(null);
  };

  // 載入既有文章
  useEffect(() => {
    if (!token || !file || file === origPath) return;
    setLoading(true);
    getFile(token, file)
      .then(({ text, sha }) => {
        const { meta, body } = parseFrontmatter(text);
        const rel = file.slice(config.postsDir.length + 1).replace(/\.md$/, '').split('/');
        const slug = rel.pop()!;
        applyData({
          meta: { ...meta, date: meta.date || emptyMeta().date },
          tagsText: meta.tags.join(', '),
          category: rel.join('/'),
          slug,
          body,
        });
        setSha(sha);
        setOrigPath(file);
        setSavedAt(undefined);
        const local = loadDraft(`file:${file}`);
        if (local && params.get('restore')) applyDraft(local);
        else setPending(local ?? null);
      })
      .catch((e) => setNotice({ kind: 'error', text: (e as Error).message }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, file, origPath]);

  // 從後台列表點進新文章的暫存
  useEffect(() => {
    if (file || !draftParam || loadedDraft.current === draftParam) return;
    loadedDraft.current = draftParam;
    const d = loadDraft(draftParam);
    if (d) applyDraft(d);
    else setNotice({ kind: 'error', text: '找不到這份暫存，可能已經發布或被清除了' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, draftParam]);

  const writeLocal = useCallback((): number | undefined => {
    const at = Date.now();
    const ok = saveDraft({ ...data, id: draftId, file: origPath, baseSha: sha, savedAt: at });
    return ok ? at : undefined;
  }, [data, draftId, origPath, sha]);

  const saveLocal = useCallback(() => {
    if (pending) return;
    const at = writeLocal();
    if (!at) return setNotice({ kind: 'error', text: '暫存失敗：瀏覽器儲存空間已滿或被停用' });
    setBaseline(snapshot);
    setSavedAt(at);
    // 新文章第一次暫存時把 id 放進網址，重新整理也能接著寫
    if (!file && !draftParam) {
      loadedDraft.current = draftId;
      navigate(`/admin/edit?draft=${draftId}`, { replace: true });
    }
  }, [pending, writeLocal, snapshot, file, draftParam, draftId, navigate]);

  // 每 10 秒自動暫存一次（有改動才存）
  const autoSave = useRef(() => {});
  autoSave.current = () => {
    if (dirty && !loading && !pending) saveLocal();
  };
  useEffect(() => {
    const id = setInterval(() => autoSave.current(), 10000);
    return () => clearInterval(id);
  }, []);

  // 關閉分頁或離開編輯器時，把還沒暫存的內容補存
  const flush = useRef(() => {});
  flush.current = () => {
    if (dirty && !loading && !pending) writeLocal();
  };
  useEffect(() => {
    const onHide = () => flush.current();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      onHide();
    };
  }, []);

  const updateMeta = (patch: Partial<PostMeta>) => {
    setMeta((m) => ({ ...m, ...patch }));
    if (patch.title !== undefined && !slugTouched) setSlug(slugify(patch.title));
  };

  const onEditorReady = useCallback((v: EditorView | null) => {
    cmRef.current = v;
    setCm(v);
  }, []);

  const run = (fn: (v: EditorView) => void) => {
    if (cmRef.current) fn(cmRef.current);
  };

  const insert = useCallback((before: string, after = '', placeholder = '') => {
    if (cmRef.current) wrapSelection(cmRef.current, before, after, placeholder);
  }, []);

  const upload = useCallback(
    async (f: File): Promise<string> => {
      if (!token) throw new Error('尚未登入');
      if (f.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`檔案超過 ${MAX_UPLOAD_MB}MB，請壓縮後再上傳`);
      const name = `${Date.now()}-${safeFileName(f.name)}`;
      await putFile(token, `${config.mediaDir}/${name}`, await fileToBase64(f), `media: upload ${name}`);
      return `media/${name}`;
    },
    [token],
  );

  const uploadImage = async (f: File | undefined) => {
    if (!f) return;
    setNotice({ kind: 'ok', text: '上傳圖片中…' });
    try {
      const src = await upload(f);
      insert(`![${f.name.replace(/\.[^.]+$/, '')}](${src})`);
      setNotice({ kind: 'ok', text: '圖片已上傳' });
    } catch (e) {
      setNotice({ kind: 'error', text: (e as Error).message });
    }
  };

  // 貼上或拖曳檔案到編輯器：先放佔位文字，上傳完再換成真正的 Markdown
  const handleFiles = useCallback(
    async (files: File[], pos: number | null) => {
      const v = cmRef.current;
      if (!v) return;
      for (const f of files) {
        const kind = f.type.startsWith('image/')
          ? 'image'
          : f.type.startsWith('video/')
            ? 'video'
            : f.type.startsWith('audio/')
              ? 'audio'
              : null;
        if (!kind) {
          setNotice({ kind: 'error', text: `不支援的檔案類型：${f.name}（可以貼圖片、影片${isMusicCategory(category) ? '、音檔' : ''}）` });
          continue;
        }
        if (kind === 'audio' && !isMusicCategory(category)) {
          setNotice({ kind: 'error', text: '音檔只能放在 Music 分類的文章' });
          continue;
        }
        const name = f.name.replace(/\.[^.]+$/, '') || kind;
        const marker = `![⏳ 上傳中：${name}…](uploading-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)})`;
        const at = pos ?? v.state.selection.main.head;
        const text = kind === 'image' ? marker : `\n${marker}\n`;
        v.dispatch({ changes: { from: at, insert: text }, selection: { anchor: at + text.length }, userEvent: 'input' });
        pos = null;
        setNotice({ kind: 'ok', text: `上傳 ${f.name} 中…` });
        try {
          const src = await upload(f);
          const md =
            kind === 'image'
              ? `![${name}](${src})`
              : kind === 'video'
                ? `\`\`\`video\nsrc: ${src}\n\`\`\``
                : `\`\`\`music\ntitle: ${name}\nsrc: ${src}\n\`\`\``;
          replaceText(v, marker, md);
          setNotice({ kind: 'ok', text: `${f.name} 已上傳` });
        } catch (e) {
          replaceText(v, marker, '');
          setNotice({ kind: 'error', text: (e as Error).message });
        }
      }
    },
    [upload, category],
  );

  // 同步捲動：滑鼠在哪一邊，就由那一邊帶動另一邊
  const driver = useRef<'editor' | 'preview'>('editor');
  const frame = useRef(0);

  const syncScroll = useCallback((from: 'editor' | 'preview') => {
    const v = cmRef.current;
    const pv = previewRef.current;
    if (!v || !pv) return;
    const sc = v.scrollDOM;
    const lines = v.state.doc.lines;
    const editorTop = (line: number) => (line > lines ? v.contentHeight : v.lineBlockAt(v.state.doc.line(line).from).top);

    // 預覽中每個區塊對應的原始碼行號與位置
    const base = pv.getBoundingClientRect().top - pv.scrollTop;
    const anchors = [{ line: 1, top: 0 }];
    pv.querySelectorAll<HTMLElement>('[data-line]').forEach((el) => {
      const line = Number(el.dataset.line);
      const top = el.getBoundingClientRect().top - base;
      const last = anchors[anchors.length - 1];
      if (line > last.line && line <= lines && top >= last.top) anchors.push({ line, top });
    });
    anchors.push({ line: lines + 1, top: pv.scrollHeight });
    const pairs = anchors.map((a) => ({ e: editorTop(a.line), p: a.top }));

    const [src, dst, key, other] =
      from === 'editor' ? ([sc, pv, 'e', 'p'] as const) : ([pv, sc, 'p', 'e'] as const);
    if (src.scrollTop + src.clientHeight >= src.scrollHeight - 4) {
      dst.scrollTop = dst.scrollHeight;
      return;
    }
    const y = src.scrollTop;
    let i = 0;
    while (i < pairs.length - 2 && pairs[i + 1][key] <= y) i++;
    const a = pairs[i];
    const b = pairs[i + 1];
    const ratio = b[key] > a[key] ? Math.min(1, Math.max(0, (y - a[key]) / (b[key] - a[key]))) : 0;
    dst.scrollTop = a[other] + ratio * (b[other] - a[other]);
  }, []);

  const requestSync = useCallback(
    (from: 'editor' | 'preview') => {
      if (driver.current !== from) return;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => syncScroll(from));
    },
    [syncScroll],
  );

  useEffect(() => {
    if (!cm) return;
    const onScroll = () => requestSync('editor');
    cm.scrollDOM.addEventListener('scroll', onScroll);
    return () => cm.scrollDOM.removeEventListener('scroll', onScroll);
  }, [cm, requestSync]);

  // 打字後預覽重新排版，再對齊一次
  useEffect(() => {
    if (view === 'split') requestSync('editor');
  }, [body, view, requestSync]);

  const save = useCallback(async () => {
    if (!token) return;
    if (!meta.title.trim()) return setNotice({ kind: 'error', text: '請輸入標題' });
    if (!/^[\w\-一-鿿]+$/.test(slug)) {
      return setNotice({ kind: 'error', text: '網址代稱只能包含英數字、中文、- 與 _' });
    }
    const path = `${config.postsDir}/${category}/${slug}.md`;
    const tags = tagsText
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const content = utf8ToBase64(stringifyPost({ ...meta, title: meta.title.trim(), tags }, body));

    setSaving(true);
    setNotice(null);
    try {
      const moved = origPath && origPath !== path;
      const res = await putFile(
        token,
        path,
        content,
        `post: ${origPath ? 'update' : 'add'} ${meta.title.trim()}`,
        moved ? undefined : sha,
      );
      if (moved && sha) await deleteFile(token, origPath, sha, `post: move ${origPath} -> ${path}`);
      removeDraft(draftId);
      setBaseline(snapshot);
      setSavedAt(undefined);
      setPending(null);
      setSha(res.sha);
      setOrigPath(path);
      navigate(`/admin/edit?file=${encodeURIComponent(path)}`, { replace: true });
      setNotice({ kind: 'ok', text: '已發布到 GitHub！網站約 1–2 分鐘後會自動更新。' });
    } catch (e) {
      const msg = (e as Error).message;
      setNotice({
        kind: 'error',
        text: msg.includes('422') && !origPath ? `已經有同名文章（${path}），請換一個網址代稱` : msg,
      });
    } finally {
      setSaving(false);
    }
  }, [token, meta, slug, category, tagsText, body, origPath, sha, navigate, draftId, snapshot]);

  // Ctrl/Cmd + S 暫存到本機（不會推上 GitHub）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveLocal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveLocal]);

  if (checking) return <div className="container page">驗證登入中…</div>;
  if (!token || !user) return <Login />;
  if (loading) return <div className="container page">讀取文章中…</div>;

  const music = isMusicCategory(category);

  return (
    <div className="editor-page">
      <div className="editor-top">
        <Link to="/admin" className="btn btn-ghost">
          ← 文章列表
        </Link>
        <div className="view-switch" role="tablist">
          {(['edit', 'split', 'preview'] as View[]).map((v) => (
            <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
              {{ edit: '編輯', split: '並排', preview: '預覽' }[v]}
            </button>
          ))}
        </div>
        <div className="editor-actions">
          <span className="draft-status">
            {pending ? '' : dirty ? '編輯中…' : savedAt ? `💾 已暫存於本機 ${formatSavedAt(savedAt)}` : ''}
          </span>
          <button className="btn btn-ghost" onClick={saveLocal} disabled={!dirty || !!pending} title="Ctrl / ⌘ + S">
            暫存
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? '發布中…' : origPath ? '更新文章' : '發布文章'}
          </button>
        </div>
      </div>

      {pending && (
        <div className="alert draft-banner">
          <span>
            這篇文章有 {formatSavedAt(pending.savedAt)} 的本機暫存，還沒發布。
            {pending.baseSha && pending.baseSha !== sha && ' 注意：GitHub 上的版本在那之後有被改過。'}
          </span>
          <span className="row-actions">
            <button className="btn btn-small" onClick={() => applyDraft(pending)}>
              還原暫存
            </button>
            <button
              className="btn btn-small btn-danger"
              onClick={() => {
                removeDraft(pending.id);
                setPending(null);
              }}
            >
              捨棄暫存
            </button>
          </span>
        </div>
      )}

      {notice && <div className={`alert ${notice.kind}`}>{notice.text}</div>}

      <div className="editor-meta">
        <input
          className="title-input"
          placeholder="文章標題"
          value={meta.title}
          onChange={(e) => updateMeta({ title: e.target.value })}
        />
        <div className="meta-grid">
          <label>
            分類
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {leafCategories().map((c) => (
                <option key={c.path} value={c.path}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            網址代稱
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
            />
          </label>
          <label>
            日期
            <input type="date" value={meta.date} onChange={(e) => updateMeta({ date: e.target.value })} />
          </label>
          <label>
            標籤（逗號分隔）
            <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
          </label>
          <label className="span-2">
            摘要（選填）
            <input value={meta.summary} onChange={(e) => updateMeta({ summary: e.target.value })} />
          </label>
          <label>
            封面圖網址（選填）
            <input value={meta.cover} onChange={(e) => updateMeta({ cover: e.target.value })} />
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={meta.draft} onChange={(e) => updateMeta({ draft: e.target.checked })} />
            草稿（不顯示在網站上）
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={meta.pinned} onChange={(e) => updateMeta({ pinned: e.target.checked })} />
            📌 置頂
          </label>
        </div>
      </div>

      <div className="toolbar">
        <button onClick={() => insert('**', '**', '粗體')} title="粗體（Ctrl+B）">
          <b>B</b>
        </button>
        <button onClick={() => insert('*', '*', '斜體')} title="斜體（Ctrl+I）">
          <i>I</i>
        </button>
        <button onClick={() => insert('~~', '~~', '刪除線')} title="刪除線（Ctrl+Shift+X）">
          <s>S</s>
        </button>
        <button onClick={() => run((v) => toggleLinePrefix(v, () => '## ', /^#{1,6} /))} title="標題">
          H
        </button>
        <span className="toolbar-sep" />
        <button onClick={() => run((v) => toggleLinePrefix(v, () => '- ', /^\s*[-*+] (\[[ xX]\] )?/))} title="項目清單">
          •≡
        </button>
        <button onClick={() => run((v) => toggleLinePrefix(v, (i) => `${i + 1}. `, /^\s*\d+\. /))} title="編號清單">
          1.
        </button>
        <button onClick={() => run((v) => toggleLinePrefix(v, () => '- [ ] ', /^\s*[-*+] \[[ xX]\] /))} title="待辦清單">
          ☑
        </button>
        <button onClick={() => run((v) => toggleLinePrefix(v, () => '> ', /^> ?/))} title="引用">
          ❝
        </button>
        <span className="toolbar-sep" />
        <button onClick={() => insert('[', '](https://)', '連結文字')} title="連結（Ctrl+K）">
          🔗
        </button>
        <button onClick={() => run((v) => wrapContainer(v, '```', '```', 'code'))} title="程式碼區塊">
          {'</>'}
        </button>
        <button
          onClick={() => run((v) => insertBlock(v, '| 欄位 1 | 欄位 2 | 欄位 3 |\n| --- | --- | --- |\n|  |  |  |', 2))}
          title="表格"
        >
          ▦
        </button>
        <button onClick={() => insert('$', '$', 'E = mc^2')} title="數學式（行內）">
          ∑
        </button>
        <button onClick={() => run((v) => insertBlock(v, '---'))} title="分隔線">
          ―
        </button>
        <select
          className="toolbar-select"
          value=""
          title="HackMD 提示框"
          onChange={(e) => {
            const kind = e.target.value;
            if (kind === 'spoiler') run((v) => wrapContainer(v, ':::spoiler 點擊展開', ':::', '藏起來的內容'));
            else if (kind) run((v) => wrapContainer(v, `:::${kind}`, ':::', '內容'));
          }}
        >
          <option value="">提示框…</option>
          <option value="info">ℹ️ info</option>
          <option value="success">✅ success</option>
          <option value="warning">⚠️ warning</option>
          <option value="danger">⛔ danger</option>
          <option value="spoiler">▸ 摺疊區塊</option>
        </select>
        <button onClick={() => run((v) => insertBlock(v, '[TOC]'))} title="插入目錄">
          目錄
        </button>
        <span className="toolbar-sep" />
        <button onClick={() => imageInput.current?.click()} title="上傳圖片（也可以直接貼上或拖曳）">
          🖼 圖片
        </button>
        <input
          ref={imageInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            uploadImage(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button onClick={() => setShowVideo(true)} title="插入影片">
          🎬 影片
        </button>
        {music ? (
          <button className="music-btn" onClick={() => setShowMusic(true)} title="插入音樂">
            🎵 插入音樂
          </button>
        ) : (
          <span className="toolbar-hint">（插入音樂僅限 Music 分類）</span>
        )}
      </div>

      <div className={`editor-panes view-${view}`}>
        {/* 編輯器一直保留，切到「預覽」只是藏起來，復原紀錄才不會不見 */}
        <div
          className="editor-pane"
          onPointerEnter={() => (driver.current = 'editor')}
          onWheel={() => (driver.current = 'editor')}
          onTouchStart={() => (driver.current = 'editor')}
          onFocus={() => (driver.current = 'editor')}
        >
          <CodeEditor
            value={body}
            onChange={setBody}
            onReady={onEditorReady}
            onCursor={setCursor}
            onFiles={handleFiles}
            placeholder="用 Markdown 開始寫作…（圖片、影片可以直接貼上或拖曳進來）"
          />
        </div>
        {view !== 'edit' && (
          <div
            className="editor-preview"
            ref={previewRef}
            onPointerEnter={() => (driver.current = 'preview')}
            onWheel={() => (driver.current = 'preview')}
            onTouchStart={() => (driver.current = 'preview')}
            onScroll={() => requestSync('preview')}
          >
            <h1 className="preview-title">{meta.title || '（未命名）'}</h1>
            <Markdown source={body} resolveMedia={rawMediaUrl} sourceLines />
          </div>
        )}
      </div>

      <div className="editor-status">
        <span>字數 {body.replace(/\s/g, '').length}</span>
        <span>共 {body.split('\n').length} 行</span>
        <span>
          第 {cursor.line} 行，第 {cursor.col} 欄
        </span>
        <span className="editor-status-hint">Ctrl+B 粗體 · Ctrl+I 斜體 · Ctrl+K 連結 · Ctrl+F 搜尋 · Ctrl+S 暫存</span>
      </div>

      {showMusic && (
        <MusicDialog
          upload={upload}
          onClose={() => setShowMusic(false)}
          onInsert={(block) => {
            setShowMusic(false);
            insert(block);
          }}
        />
      )}

      {showVideo && (
        <VideoDialog
          upload={upload}
          onClose={() => setShowVideo(false)}
          onInsert={(block) => {
            setShowVideo(false);
            insert(block);
          }}
        />
      )}
    </div>
  );
}
