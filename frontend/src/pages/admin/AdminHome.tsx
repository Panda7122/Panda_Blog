import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { config } from '../../config';
import { useAuth } from '../../lib/auth';
import { categoryLabel, leafCategories } from '../../lib/categories';
import { deleteFile, latestRun, listPostFiles, type TreeEntry, type WorkflowRun } from '../../lib/github';
import { allPosts } from '../../lib/posts';
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
