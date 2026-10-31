import { useEffect, useState, type FormEvent } from 'react';
import { config } from '../config';
import { useAuth } from '../lib/auth';
import {
  addComment,
  deleteComment,
  formatCommentTime,
  getInteractions,
  toggleLike,
  type Comment,
} from '../lib/interact';

const MAX_BODY = 1000;

/** 文章底下的按讚與匿名留言；沒設定 API 網址時不顯示 */
export function PostInteractions({ post }: { post: string }) {
  const { token, user } = useAuth();
  const [likes, setLikes] = useState<number>();
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>();
  const [loadError, setLoadError] = useState('');
  const [liking, setLiking] = useState(false);

  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('panda-blog:comment-name') ?? '';
    } catch {
      return '';
    }
  });
  const [body, setBody] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!config.apiUrl) return;
    let alive = true;
    setLikes(undefined);
    setComments(undefined);
    setLoadError('');
    getInteractions(post)
      .then((d) => {
        if (!alive) return;
        setLikes(d.likes);
        setLiked(d.liked);
        setComments(d.comments);
      })
      .catch((e) => alive && setLoadError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [post]);

  if (!config.apiUrl) return null;

  const like = async () => {
    if (liking) return;
    setLiking(true);
    // 先更新畫面，失敗再還原
    const prev = { likes, liked };
    setLiked(!liked);
    setLikes((n) => (n ?? 0) + (liked ? -1 : 1));
    try {
      const r = await toggleLike(post);
      setLikes(r.likes);
      setLiked(r.liked);
    } catch {
      setLikes(prev.likes);
      setLiked(prev.liked);
    } finally {
      setLiking(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    setFormError('');
    try {
      const { comment } = await addComment(post, name.trim(), body.trim(), website);
      setComments((c) => [...(c ?? []), comment]);
      setBody('');
      try {
        localStorage.setItem('panda-blog:comment-name', name.trim());
      } catch {
        /* ignore */
      }
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const remove = async (c: Comment) => {
    if (!token || !confirm(`確定要刪除 ${c.name} 的留言？`)) return;
    try {
      await deleteComment(token, c.id);
      setComments((list) => list?.filter((x) => x.id !== c.id));
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const isAdmin = !!token && !!user;

  return (
    <section className="interactions">
      <div className="like-row">
        <button
          className={`like-btn ${liked ? 'liked' : ''}`}
          onClick={like}
          disabled={likes === undefined}
          aria-pressed={liked}
          title={liked ? '收回讚' : '按讚'}
        >
          <span className="like-heart">{liked ? '♥' : '♡'}</span>
          {likes ?? '…'}
        </button>
        <span className="muted">{liked ? '謝謝你的讚！' : '喜歡這篇文章的話按個讚吧'}</span>
      </div>

      <h2 className="comments-title">
        留言 {comments && <span className="pill-count">{comments.length}</span>}
      </h2>

      {loadError && <div className="alert error">讀取留言失敗：{loadError}</div>}
      {!comments && !loadError && <p className="muted">讀取留言中…</p>}
      {comments?.length === 0 && <p className="muted">還沒有人留言，來當第一個吧。</p>}

      {comments && comments.length > 0 && (
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id} className="comment">
              <div className="comment-head">
                <strong>{c.name}</strong>
                <time>{formatCommentTime(c.created_at)}</time>
                {isAdmin && (
                  <button className="btn btn-small btn-danger" onClick={() => remove(c)}>
                    刪除
                  </button>
                )}
              </div>
              <p className="comment-body">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form className="comment-form" onSubmit={submit}>
        <input
          className="comment-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="暱稱（選填，預設為「匿名」）"
          maxLength={30}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="留下你想說的話…"
          maxLength={MAX_BODY}
          rows={4}
          required
        />
        {/* 蜜罐欄位：真人看不到，機器人填了就會被擋 */}
        <input
          className="hp-field"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          aria-hidden="true"
        />
        {formError && <div className="alert error">{formError}</div>}
        <div className="comment-form-foot">
          <small className="muted">
            {body.length}/{MAX_BODY}・匿名留言，不需要登入
          </small>
          <button className="btn btn-primary" type="submit" disabled={sending || !body.trim()}>
            {sending ? '送出中…' : '送出留言'}
          </button>
        </div>
      </form>
    </section>
  );
}
