// 這些值在 GitHub Actions build 時會自動帶入（見 .github/workflows/deploy.yml），
// 本機開發可以在 frontend/.env.local 設定。
const repoFull = import.meta.env.VITE_GITHUB_REPO || 'Panda7122/Panda_Blog';
const [owner, repo] = repoFull.split('/');

export const config = {
  siteTitle: import.meta.env.VITE_SITE_TITLE || '碎心日記',
  tagline: '一個心碎的人紀錄著沒有妳的生活',
  // 首頁中間的頭像，檔案放在 content/public/images/
  heroImage: 'images/panda.jpg',
  owner,
  repo,
  branch: import.meta.env.VITE_GITHUB_BRANCH || 'master',
  // 只有這個 GitHub 帳號可以登入後台（寫死，不受環境變數影響）
  adminUser: 'Panda7122',
  // Cloudflare Worker 的網址，例如 https://record-blog-oauth.xxx.workers.dev
  oauthUrl: (import.meta.env.VITE_OAUTH_URL || '').replace(/\/$/, ''),
  postsDir: 'content/posts',
  mediaDir: 'content/public/media',
};
