import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { config } from '../../config';
import { useAuth } from '../../lib/auth';
import { categoryLabel, leafCategories } from '../../lib/categories';
import { deleteComment, formatCommentTime, recentComments, type Comment } from '../../lib/interact';
import { formatSavedAt, listDrafts, removeDraft, type Draft } from '../../lib/drafts';
import { deleteFile, latestRun, listPostFiles, type TreeEntry, type WorkflowRun } from '../../lib/github';
import { allPosts, postUrl } from '../../lib/posts';
import Login from './Login';

function DeployStatus({ run }: { run?: WorkflowRun }) {
  if (!run) return null;
  const state =
    run.status !== 'completed' ? 'running' : run.conclusion === 'success' ? 'success' : 'failed';
  const text = { running: '部署中…', success: '已部署', failed: '部署失敗' }[state];
  return (
    <a className={`deploy-status ${state}`} href={run.html_url} target="_blank" rel="noreferrer">
      <span className="dot" />
      {text}
      <small>{run.head_commit?.message.split('\n')[0]}</small>
    </a>
  );
}

export default function AdminHome() {
  const { token, user, checking, logout } = useAuth();
  const [files, setFiles] = useState<TreeEntry[] | null>(null);
  const [run, setRun] = useState<WorkflowRun>();
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>(listDrafts);
  const [comments, setComments] = useState<Comment[]>();

  const titles = useMemo(() => new Map(allPosts.map((p) => [p.file, p.title])), []);

  const refresh = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const [f, r] = await Promise.all([listPostFiles(token), latestRun(token).catch(() => undefined)]);
      setFiles(f);
      setRun(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (config.apiUrl) recentComments().then((r) => setComments(r.comments)).catch(() => setComments([]));
  }, []);

  // 部署中時每 10 秒更新一次狀態
  useEffect(() => {
    if (!token || !run || run.status === 'completed') return;
    const id = setInterval(() => latestRun(token).then(setRun).catch(() => {}), 10000);
    return () => clearInterval(id);
  }, [token, run]);

  if (checking) return <div className="container page">驗證登入中…</div>;
  if (!token || !user) return <Login />;

  const remove = async (f: TreeEntry) => {
    if (!confirm(`確定要刪除 ${f.path}？`)) return;
    try {
      await deleteFile(token, f.path, f.sha, `post: delete ${f.path.split('/').pop()}`);
      await refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const discard = (d: Draft) => {
    if (!confirm(`確定要捨棄「${d.meta.title || '（未命名）'}」的本機暫存？`)) return;
    removeDraft(d.id);
    setDrafts(listDrafts());
  };

  const removeComment = async (c: Comment) => {
    if (!confirm(`確定要刪除 ${c.name} 的留言？`)) return;
    try {
      await deleteComment(token, c.id);
      setComments((list) => list?.filter((x) => x.id !== c.id));
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const postsByKey = new Map(allPosts.map((p) => [`${p.category}/${p.slug}`, p]));

  const draftFiles = new Set(drafts.map((d) => d.file).filter(Boolean));

  const groups = leafCategories().map((c) => ({
    ...c,
    files: (files ?? []).filter((f) => f.path.startsWith(`${config.postsDir}/${c.path}/`) && f.path.split('/').length === config.postsDir.split('/').length + c.path.split('/').length + 1),
  }));

  return (
    <div className="container page admin">
      <header className="admin-header">
        <div className="admin-user">
          <img src={user.avatar_url} alt="" />
          <div>
            <strong>{user.name || user.login}</strong>
            <small>
              @{user.login} · {config.owner}/{config.repo}
            </small>
          </div>
        </div>
        <div className="admin-actions">
          <DeployStatus run={run} />
          <Link to="/admin/edit" className="btn btn-primary">
            ＋ 新文章
          </Link>
          <button className="btn btn-ghost" onClick={logout}>
            登出
          </button>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}
      {!files && !error && <p>讀取文章列表中…</p>}

      {drafts.length > 0 && (
        <section className="admin-group">
          <h3>
            💾 本機暫存 <span className="pill-count">{drafts.length}</span>
          </h3>
          <p className="muted small-note">只存在這台裝置的瀏覽器裡，按「發布」之後才會推上 GitHub。</p>
          <ul className="admin-list">
            {drafts.map((d) => (
              <li key={d.id}>
                <div>
                  <strong>{d.meta.title || '（未命名）'}</strong>
                  <span className="chip">{d.file ? '修改既有文章' : '新文章'}</span>
                  <small>
                    {categoryLabel(d.category)} · 暫存於 {formatSavedAt(d.savedAt)}
                  </small>
                </div>
                <div className="row-actions">
                  <Link
                    to={d.file ? `/admin/edit?file=${encodeURIComponent(d.file)}&restore=1` : `/admin/edit?draft=${d.id}`}
                    className="btn btn-small"
                  >
                    繼續寫
                  </Link>
                  <button className="btn btn-small btn-danger" onClick={() => discard(d)}>
                    捨棄
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {comments && comments.length > 0 && (
        <section className="admin-group">
          <h3>
            💬 最新留言 <span className="pill-count">{comments.length}</span>
          </h3>
          <ul className="admin-list">
            {comments.map((c) => {
              const p = postsByKey.get(c.post);
              return (
                <li key={c.id}>
                  <div>
                    <strong>{c.name}</strong>
                    <span className="admin-comment-body">{c.body}</span>
                    <small>
                      {p ? <Link to={postUrl(p)}>{p.title}</Link> : c.post} · {formatCommentTime(c.created_at)}
                    </small>
                  </div>
                  <div className="row-actions">
                    <button className="btn btn-small btn-danger" onClick={() => removeComment(c)}>
                      刪除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {files &&
        groups.map((g) => (
          <section key={g.path} className="admin-group">
            <h3>
              {categoryLabel(g.path)} <span className="pill-count">{g.files.length}</span>
            </h3>
            {g.files.length === 0 ? (
              <p className="empty small">尚無文章</p>
            ) : (
              <ul className="admin-list">
                {g.files.map((f) => (
                  <li key={f.path}>
                    <div>
                      <strong>{titles.get(f.path) ?? f.path.split('/').pop()?.replace(/\.md$/, '')}</strong>
                      {!titles.has(f.path) && <span className="chip warn">尚未部署 / 草稿</span>}
                      {draftFiles.has(f.path) && <span className="chip">💾 有本機暫存</span>}
                      <small>{f.path}</small>
                    </div>
                    <div className="row-actions">
                      <Link to={`/admin/edit?file=${encodeURIComponent(f.path)}`} className="btn btn-small">
                        編輯
                      </Link>
                      <button className="btn btn-small btn-danger" onClick={() => remove(f)}>
                        刪除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
    </div>
  );
}
