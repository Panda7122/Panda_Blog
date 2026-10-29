import { Link } from 'react-router-dom';
import { categoryLabel, findCategory } from '../lib/categories';
import { postUrl, type Post } from '../lib/posts';

export function PostCard({ post }: { post: Post }) {
  const cat = findCategory(post.category);
  return (
    <article className="post-card">
      <Link to={postUrl(post)} className="post-card-link">
        {post.cover && <img className="post-card-cover" src={post.cover} alt="" loading="lazy" />}
        <div className="post-card-body">
          <div className="post-card-meta">
            <span className="chip">
              {cat?.category.icon} {categoryLabel(post.category)}
            </span>
            <time>{post.date}</time>
          </div>
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
          {post.tags.length > 0 && (
            <div className="tags">
              {post.tags.map((t) => (
                <span key={t} className="tag">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
