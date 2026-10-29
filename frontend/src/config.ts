// 這些值在 GitHub Actions build 時會自動帶入（見 .github/workflows/deploy.yml），
// 本機開發可以在 frontend/.env.local 設定。
const repoFull = import.meta.env.VITE_GITHUB_REPO || 'Panda7122/Panda_Blog';
const [owner, repo] = repoFull.split('/');

export const config = {
  siteTitle: import.meta.env.VITE_SITE_TITLE || '碎心日記',
  // 改了標語要執行 python3 scripts/subset_tagline_font.py 重新產生手寫字型
  tagline: '一個人紀錄著沒有妳的生活',
  // 首頁中間的頭像，檔案放在 content/public/images/
  heroImage: 'images/panda.jpg',
  // 標語下方的社群連結
  socials: [
    { kind: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/panda.coffee._._/' },
    { kind: 'github', label: 'GitHub', url: 'https://github.com/Panda7122/' },
  ] as { kind: 'instagram' | 'github'; label: string; url: string }[],
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
