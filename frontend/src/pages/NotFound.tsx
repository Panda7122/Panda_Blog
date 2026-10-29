import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container page not-found">
      <h1>404</h1>
      <p>找不到這個頁面。如果是剛發布的文章，部署可能還在進行中，請稍候一兩分鐘再重新整理。</p>
      <Link to="/" className="btn btn-primary">
        回首頁
      </Link>
    </div>
  );
}
