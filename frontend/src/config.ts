// 這些值在 GitHub Actions build 時會自動帶入（見 .github/workflows/deploy.yml），
// 本機開發可以在 frontend/.env.local 設定。
const repoFull = import.meta.env.VITE_GITHUB_REPO || 'your-github-name/record_blog';
const [owner, repo] = repoFull.split('/');

export const config = {
  siteTitle: import.meta.env.VITE_SITE_TITLE || 'Record Blog',
  tagline: '咖啡、球場、音樂、程式與畫筆之間的日常紀錄',
  owner,
  repo,
  branch: import.meta.env.VITE_GITHUB_BRANCH || 'main',
  // 只有這個 GitHub 帳號可以登入後台
  adminUser: import.meta.env.VITE_ADMIN_USER || owner,
  // Cloudflare Worker 的網址，例如 https://record-blog-oauth.xxx.workers.dev
  oauthUrl: (import.meta.env.VITE_OAUTH_URL || '').replace(/\/$/, ''),
  postsDir: 'content/posts',
  mediaDir: 'content/public/media',
};
