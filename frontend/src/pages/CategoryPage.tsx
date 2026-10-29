import { Link, NavLink, useParams } from 'react-router-dom';
import { findCategory } from '../lib/categories';
import { postsIn } from '../lib/posts';
import { PostCard } from '../components/PostCard';
import NotFound from './NotFound';

export default function CategoryPage() {
  const path = useParams()['*'] ?? '';
  const resolved = findCategory(path);
  if (!resolved) return <NotFound />;

  const { category, parent } = resolved;
  const posts = postsIn(path);
  const top = parent ?? category;
  const topPath = parent ? path.split('/')[0] : path;

  return (
    <div className="container page">
      <nav className="breadcrumb">
        <Link to="/">首頁</Link>
        {parent && (
          <>
            <span>/</span>
            <Link to={`/category/${topPath}`}>{parent.name}</Link>
          </>
        )}
        <span>/</span>
        <span>{category.name}</span>
      </nav>

      <header className="page-header">
        <span className="page-icon">{category.icon}</span>
        <div>
          <h1>{category.name}</h1>
          <p>{category.description}</p>
        </div>
      </header>

      {top.children && (
        <div className="subnav">
          <NavLink end to={`/category/${topPath}`} className="pill">
            全部
          </NavLink>
          {top.children.map((ch) => (
            <NavLink key={ch.slug} to={`/category/${topPath}/${ch.slug}`} className="pill">
              {ch.icon} {ch.name}
              <span className="pill-count">{postsIn(`${topPath}/${ch.slug}`).length}</span>
            </NavLink>
          ))}
        </div>
      )}

      {posts.length ? (
        <div className="post-list">
          {posts.map((p) => (
            <PostCard key={p.file} post={p} />
          ))}
        </div>
      ) : (
        <p className="empty">這個分類還沒有文章。</p>
      )}
    </div>
  );
}
