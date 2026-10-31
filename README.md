# 碎心日記

> 一個人紀錄著沒有妳的生活

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

Coffee · Sport（Badminton / Other）· Music · Computer Science（Algorithm / MIR / System）· Drawing · Game · Others
定義在 `frontend/src/lib/categories.ts`。

## 首頁圖片

把圖片放在 `content/public/images/panda.jpg`（頭像，建議正方形、400×400px 以上，會裁成圓形）。
想用其他檔名或格式，改 `frontend/src/config.ts` 的 `heroImage`。圖片不存在時首頁只會顯示文字。

## 首頁標語字型

標語使用「辰宇落雁體」（OFL-1.1），只內嵌標語用到的字元（約 10KB）。
修改 `frontend/src/config.ts` 的 `tagline` 後要重新產生：

```bash
pip install fonttools
python3 scripts/subset_tagline_font.py
```

沒重新產生的話，新加的字會以霞鶩文楷顯示。

## 發文流程

1. 到網站的「後台」，用 GitHub 登入（或貼上 Personal Access Token）
2. 寫文章 → 按「發布文章」→ 後台透過 GitHub API 把 `content/posts/<分欄>/<slug>.md` commit 到 repo
3. GitHub Actions 自動重新部署，約 1–2 分鐘後網站更新（後台右上角會顯示部署狀態）

### 本機暫存

寫到一半不用發布：編輯器每 10 秒會自動暫存一次（有改動才存），也可以按「暫存」或 `Ctrl/⌘ + S`。暫存只存在這台裝置瀏覽器的 localStorage，**不會 commit 到 GitHub**，按「發布 / 更新文章」才會推上去，發布成功後暫存會自動清掉。

- 後台首頁最上面的「💾 本機暫存」列出所有暫存，可以繼續寫或捨棄
- 打開一篇有暫存的既有文章時，會詢問要「還原暫存」還是「捨棄暫存」；如果 GitHub 上的版本在暫存之後被改過也會提醒
- 換電腦、換瀏覽器或清除網站資料就看不到暫存；在編輯器裡上傳的圖片 / 音檔仍會立刻上傳到 repo

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
2. `worker/wrangler.toml` 已設定好 `ALLOWED_USER = "Panda7122"`（用自訂網域的話要改 `ALLOWED_ORIGINS`），然後：
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

### 3. 按讚與匿名留言（Cloudflare Worker + D1）

按讚數和留言存在 Cloudflare D1 資料庫（免費額度很夠用），由同一個 Worker 提供 API。沒設定的話文章頁就不會顯示按讚與留言區。

```bash
cd worker
npm install
npx wrangler login
npx wrangler d1 create panda-blog              # 把印出來的 database_id 貼到 wrangler.toml 的 [[d1_databases]]
npx wrangler d1 migrations apply panda-blog --remote
npx wrangler secret put IP_SALT                # 隨便打一串亂碼，用來雜湊訪客 IP
npx wrangler deploy
```

然後在 repo → Settings → Secrets and variables → Actions → **Variables** 新增 `API_URL` = Worker 網址（不含結尾 `/`；有設 `OAUTH_URL` 而且是同一個 Worker 的話可以不設），重新執行一次部署。

- **按讚**：每個瀏覽器對每篇文章一個讚，再按一次收回；同一個 IP 對同一篇最多 30 個讚
- **留言**：不需登入，暱稱選填（預設「匿名」），最多 1000 字；同一個 IP 20 秒內只能留一則、一天最多 30 則，另有蜜罐欄位擋機器人。留言以純文字顯示，不會執行 HTML
- **管理**：站長登入後台後，文章底下的留言會出現「刪除」按鈕，後台首頁也有「💬 最新留言」列表
- 資料庫只存 IP 加鹽後的雜湊，不存原始 IP

## 安全性

- 只有 GitHub 帳號 **Panda7122** 能登入後台：Worker 只會把 token 發給 `ALLOWED_USER`，前端 `config.ts` 的 `adminUser` 也會再檢查一次
- 真正的權限由 GitHub 控管：沒有這個 repo 寫入權限的人就算拿到後台頁面也無法發文
- token 只存在你自己瀏覽器的 localStorage；在公用電腦用完請登出
