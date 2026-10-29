import { useState } from 'react';
import { Link } from 'react-router-dom';
import { config } from '../config';
import { categories } from '../lib/categories';
import { allPosts, pinnedPosts, postsIn } from '../lib/posts';
import { PostCard } from '../components/PostCard';

export default function Home() {
  const latest = allPosts.filter((p) => !p.pinned).slice(0, 6);
  const [heroOk, setHeroOk] = useState(true);
  return (
    <>
      <section className="hero">
        <div className="container">
          {heroOk && (
            <img className="hero-image" src={config.heroImage} alt={config.siteTitle} onError={() => setHeroOk(false)} />
          )}
          <p className="hero-tagline">{config.tagline}</p>
        </div>
      </section>

      <div className="container">
        {pinnedPosts.length > 0 && (
          <section className="section">
            <h2 className="section-title">置頂</h2>
            <div className="post-list">
              {pinnedPosts.map((p) => (
                <PostCard key={p.file} post={p} />
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <h2 className="section-title">分類</h2>
          <div className="category-grid">
            {categories.map((c) => (
              <Link key={c.slug} to={`/category/${c.slug}`} className="category-card">
                <span className="category-icon">{c.icon}</span>
                <span className="category-name">{c.name}</span>
                <span className="category-desc">{c.description}</span>
                {c.children && (
                  <span className="category-subs">{c.children.map((ch) => ch.name).join(' · ')}</span>
                )}
                <span className="category-count">{postsIn(c.slug).length} 篇</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">最新文章</h2>
          {latest.length ? (
            <div className="post-list">
              {latest.map((p) => (
                <PostCard key={p.file} post={p} />
              ))}
            </div>
          ) : (
            <p className="empty">還沒有文章，到後台寫第一篇吧！</p>
          )}
        </section>
      </div>
    </>
  );
}
