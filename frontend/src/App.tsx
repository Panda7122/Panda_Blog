import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import CategoryPage from './pages/CategoryPage';
import PostPage from './pages/PostPage';
import NotFound from './pages/NotFound';

// 後台只有站長會用到，拆成獨立的 chunk
const AdminHome = lazy(() => import('./pages/admin/AdminHome'));
const Editor = lazy(() => import('./pages/admin/Editor'));

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout>
          <Suspense fallback={<div className="container page">載入中…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/category/*" element={<CategoryPage />} />
              <Route path="/post/*" element={<PostPage />} />
              <Route path="/admin" element={<AdminHome />} />
              <Route path="/admin/edit" element={<Editor />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Layout>
      </HashRouter>
    </AuthProvider>
  );
}
