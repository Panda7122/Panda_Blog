# Record Blog

淺紫色基調的個人部落格。前後端分離，前端部署在 GitHub Pages，後台用 GitHub 帳號登入後直接把文章 commit 回這個 repo。

```
frontend/            前端：Vite + React + TypeScript
worker/              後端：Cloudflare Worker（GitHub OAuth 登入）
content/posts/       文章（Markdown），資料夾 = 分欄
content/public/      靜態檔，上傳的音樂/圖片在 content/public/media/
.github/workflows/   push 到 main 時自動 build + 部署
.claude/skills/      給 Claude Code 用的專案 skill
```

## 分欄

Coffee · Sport（Badminton / Other）· Music · Computer Science（Algorithm / MIR / System）· Drawing
定義在 `frontend/src/lib/categories.ts`。

## 發文流程

1. 到網站的「後台」，用 GitHub 登入（或貼上 Personal Access Token）
2. 寫文章 → 按「發布文章」→ 後台透過 GitHub API 把 `content/posts/<分欄>/<slug>.md` commit 到 repo
3. GitHub Actions 自動重新部署，約 1–2 分鐘後網站更新（後台右上角會顯示部署狀態）

在 **Music** 分欄的文章，編輯器工具列會出現「🎵 插入音樂」，可以上傳音檔或貼 YouTube / Spotify / SoundCloud 網址，會產生：

````markdown
```music
title: 曲名
artist: 演出者
src: media/xxx.mp3
```
````

## 本機開發

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
```

## 部署

### 1. GitHub Pages

1. 建立 public repo，push 到 `main`
2. repo → Settings → Pages → Source 選 **GitHub Actions**
3. 網站會在 `https://<帳號>.github.io/<repo>/`

repo 名稱、站長帳號由 workflow 自動帶入，不需要改程式。
此時已可用 **Fine-grained Personal Access Token** 登入後台（只授權此 repo：Contents 讀寫、Actions 唯讀）。

### 2. GitHub 登入按鈕（Cloudflare Worker）

1. GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App
   - Homepage URL：`https://<帳號>.github.io/<repo>/`
   - Authorization callback URL：`https://record-blog-oauth.<你的子網域>.workers.dev/callback`
2. 修改 `worker/wrangler.toml` 的 `ALLOWED_USER`、`ALLOWED_ORIGINS`，然後：
   ```bash
   cd worker
   npm install
   npx wrangler login
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   npx wrangler deploy
   ```
3. repo → Settings → Secrets and variables → Actions → **Variables** 新增
   - `OAUTH_URL`：Worker 網址
   - `SITE_TITLE`：網站標題（選填）
4. 重新執行一次 Actions 部署

## 安全性

- Worker 只會把 token 發給 `ALLOWED_USER`，前端也會再檢查登入帳號是否為 repo 擁有者
- 真正的權限由 GitHub 控管：沒有這個 repo 寫入權限的人就算拿到後台頁面也無法發文
- token 只存在你自己瀏覽器的 localStorage；在公用電腦用完請登出
