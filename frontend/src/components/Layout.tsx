import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { config } from '../config';
import { categories } from '../lib/categories';

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="site">
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden />
            {config.siteTitle}
          </Link>
          <button
            className="nav-toggle"
            aria-label="選單"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
          <nav className={`nav ${open ? 'open' : ''}`}>
            {categories.map((c) => (
              <div className="nav-item" key={c.slug}>
                <NavLink to={`/category/${c.slug}`} className="nav-link">
                  {c.name}
                  {c.children && <span className="caret">▾</span>}
                </NavLink>
                {c.children && (
                  <div className="dropdown">
                    {c.children.map((ch) => (
                      <NavLink key={ch.slug} to={`/category/${c.slug}/${ch.slug}`} className="dropdown-link">
                        <span>{ch.icon}</span> {ch.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <NavLink to="/admin" className="nav-link nav-admin">
              後台
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="site-main">{children}</main>
      <footer className="site-footer">
        <div className="container">
          © {new Date().getFullYear()} {config.siteTitle} · Powered by GitHub Pages
        </div>
      </footer>
    </div>
  );
}
