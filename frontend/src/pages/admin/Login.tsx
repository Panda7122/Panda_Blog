import { useEffect, useState, type FormEvent } from 'react';
import { config } from '../../config';
import { useAuth } from '../../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showToken, setShowToken] = useState(!config.oauthUrl);

  // 接收 OAuth Worker popup 傳回來的 token
  useEffect(() => {
    if (!config.oauthUrl) return;
    const workerOrigin = new URL(config.oauthUrl).origin;
    const onMessage = async (e: MessageEvent) => {
      if (e.origin !== workerOrigin || e.data?.type !== 'record-blog-oauth') return;
      if (e.data.error) {
        setError(e.data.error);
        setBusy(false);
        return;
      }
      try {
        await login(e.data.token);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [login]);

  const oauth = () => {
    setError('');
    setBusy(true);
    const url = `${config.oauthUrl}/login?origin=${encodeURIComponent(window.location.origin)}`;
    const popup = window.open(url, 'record-blog-oauth', 'width=600,height=720');
    if (!popup) {
      setBusy(false);
      setError('瀏覽器擋住了彈出視窗，請允許後再試一次');
      return;
    }
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setBusy(false);
      }
    }, 500);
  };

  const submitToken = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(token);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <div className="login-card">
        <div className="login-mark" aria-hidden />
        <h1>站長後台</h1>
        <p className="muted">
          使用 GitHub 帳號 <strong>{config.adminUser}</strong> 登入，發布的文章會直接 commit 到{' '}
          <code>
            {config.owner}/{config.repo}
          </code>
          。
        </p>

        {config.oauthUrl && (
          <button className="btn btn-github" onClick={oauth} disabled={busy}>
            <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden>
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
            {busy ? '等待 GitHub 授權…' : '使用 GitHub 登入'}
          </button>
        )}

        {config.oauthUrl && (
          <button className="link-btn" onClick={() => setShowToken((s) => !s)}>
            {showToken ? '收起' : '改用 Personal Access Token 登入'}
          </button>
        )}

        {showToken && (
          <form onSubmit={submitToken} className="token-form">
            <label>
              GitHub Personal Access Token
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="github_pat_..."
                autoComplete="off"
              />
            </label>
            <small className="muted">
              建議使用{' '}
              <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
                Fine-grained token
              </a>
              ，只授權這個 repo 的 <em>Contents: Read and write</em> 與 <em>Actions: Read-only</em>。Token
              只會存在這台電腦的瀏覽器裡。
            </small>
            <button className="btn btn-primary" disabled={busy || !token}>
              {busy ? '驗證中…' : '登入'}
            </button>
          </form>
        )}

        {error && <div className="alert error">{error}</div>}
      </div>
    </div>
  );
}
