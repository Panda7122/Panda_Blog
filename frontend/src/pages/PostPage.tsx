import { Link, useParams } from 'react-router-dom';
import { categoryLabel, findCategory } from '../lib/categories';
import { allPosts, findPost, postUrl } from '../lib/posts';
import { Markdown } from '../components/Markdown';
import { PostInteractions } from '../components/PostInteractions';
import NotFound from './NotFound';

export default function PostPage() {
  const parts = (useParams()['*'] ?? '').split('/');
  const slug = parts.pop() ?? '';
  const category = parts.join('/');
  const post = findPost(category, slug);
  if (!post) return <NotFound />;

  const resolved = findCategory(category);
  const idx = allPosts.indexOf(post);
  const newer = allPosts[idx - 1];
  const older = allPosts[idx + 1];

  return (
    <div className="container page">
      <nav className="breadcrumb">
        <Link to="/">首頁</Link>
        {resolved?.parent && (
          <>
            <span>/</span>
            <Link to={`/category/${category.split('/')[0]}`}>{resolved.parent.name}</Link>
          </>
        )}
        <span>/</span>
        <Link to={`/category/${category}`}>{resolved?.category.name ?? category}</Link>
      </nav>

      <article className="article">
        <header className="article-header">
          <span className="chip">
            {resolved?.category.icon} {categoryLabel(category)}
          </span>
          <h1>{post.title}</h1>
          <div className="article-meta">
            <time>{post.date}</time>
            <span>·</span>
            <span>約 {post.readingMinutes} 分鐘</span>
          </div>
          {post.tags.length > 0 && (
            <div className="tags">
              {post.tags.map((t) => (
                <span key={t} className="tag">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </header>
        {post.cover && <img className="article-cover" src={post.cover} alt="" />}
        <Markdown source={post.body} />
      </article>

      <PostInteractions post={`${post.category}/${post.slug}`} />

      <nav className="post-nav">
        {older ? (
          <Link to={postUrl(older)} className="post-nav-link">
            <small>← 上一篇</small>
            {older.title}
          </Link>
        ) : (
          <span />
        )}
        {newer && (
          <Link to={postUrl(newer)} className="post-nav-link next">
            <small>下一篇 →</small>
            {newer.title}
          </Link>
        )}
      </nav>
    </div>
  );
}
