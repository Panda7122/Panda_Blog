import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { config } from '../../config';
import { useAuth } from '../../lib/auth';
import { isMusicCategory, leafCategories } from '../../lib/categories';
import { emptyMeta, parseFrontmatter, stringifyPost, type PostMeta } from '../../lib/frontmatter';
import { deleteFile, fileToBase64, getFile, putFile, rawMediaUrl, utf8ToBase64 } from '../../lib/github';
import { Markdown } from '../../components/Markdown';
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

export default function Editor() {
  const { token, user, checking } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const file = params.get('file');

  const [meta, setMeta] = useState<PostMeta>(emptyMeta);
  const [tagsText, setTagsText] = useState('');
  const [category, setCategory] = useState(leafCategories()[0].path);
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [body, setBody] = useState('');
  const [sha, setSha] = useState<string>();
  const [origPath, setOrigPath] = useState<string>();
  const [view, setView] = useState<View>('split');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [showMusic, setShowMusic] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  // 載入既有文章
  useEffect(() => {
    if (!token || !file || file === origPath) return;
    setLoading(true);
    getFile(token, file)
      .then(({ text, sha }) => {
        const { meta, body } = parseFrontmatter(text);
        const rel = file.slice(config.postsDir.length + 1).replace(/\.md$/, '').split('/');
        setSlug(rel.pop()!);
        setSlugTouched(true);
        setCategory(rel.join('/'));
        setMeta({ ...meta, date: meta.date || emptyMeta().date });
        setTagsText(meta.tags.join(', '));
        setBody(body);
        setSha(sha);
        setOrigPath(file);
      })
      .catch((e) => setNotice({ kind: 'error', text: (e as Error).message }))
      .finally(() => setLoading(false));
  }, [token, file, origPath]);

  const updateMeta = (patch: Partial<PostMeta>) => {
    setMeta((m) => ({ ...m, ...patch }));
    if (patch.title !== undefined && !slugTouched) setSlug(slugify(patch.title));
  };

  const insert = useCallback((before: string, after = '', placeholder = '') => {
    const ta = textarea.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const selected = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + selected + after + value.slice(e);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
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
  }, [token, meta, slug, category, tagsText, body, origPath, sha, navigate]);

  // Ctrl/Cmd + S 儲存
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saving) save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, saving]);

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
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? '發布中…' : origPath ? '更新文章' : '發布文章'}
        </button>
      </div>

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
        </div>
      </div>

      <div className="toolbar">
        <button onClick={() => insert('**', '**', '粗體')} title="粗體">
          <b>B</b>
        </button>
        <button onClick={() => insert('*', '*', '斜體')} title="斜體">
          <i>I</i>
        </button>
        <button onClick={() => insert('\n## ', '', '標題')} title="標題">
          H
        </button>
        <button onClick={() => insert('[', '](https://)', '連結文字')} title="連結">
          🔗
        </button>
        <button onClick={() => insert('\n> ', '', '引用')} title="引用">
          ❝
        </button>
        <button onClick={() => insert('\n```\n', '\n```\n', 'code')} title="程式碼">
          {'</>'}
        </button>
        <button onClick={() => imageInput.current?.click()} title="上傳圖片">
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
        {music ? (
          <button className="music-btn" onClick={() => setShowMusic(true)} title="插入音樂">
            🎵 插入音樂
          </button>
        ) : (
          <span className="toolbar-hint">（插入音樂僅限 Music 分類）</span>
        )}
      </div>

      <div className={`editor-panes view-${view}`}>
        {view !== 'preview' && (
          <textarea
            ref={textarea}
            className="editor-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="用 Markdown 開始寫作…"
            spellCheck={false}
          />
        )}
        {view !== 'edit' && (
          <div className="editor-preview">
            <h1 className="preview-title">{meta.title || '（未命名）'}</h1>
            <Markdown source={body} resolveMedia={rawMediaUrl} />
          </div>
        )}
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
    </div>
  );
}
