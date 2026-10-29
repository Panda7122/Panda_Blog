---
name: blog-dev
description: Run, build, and visually verify the blog frontend locally (Vite dev/preview server + headless Chromium screenshots). Use when asked to start the site, check that a change works, debug a rendering problem, or before committing frontend changes.
---

# 本機開發與驗證

專案結構：

- `frontend/` — Vite + React + TS（前端，部署到 GitHub Pages）
- `worker/` — Cloudflare Worker（後端，只負責 GitHub OAuth）
- `content/posts/` — 文章；`content/public/` — 會被複製到網站根目錄的靜態檔（Vite 的 `publicDir`）

## 啟動

```bash
cd frontend
npm install          # 第一次或 package.json 改過
npm run dev          # http://localhost:5173，改文章/程式會即時更新
```

後台在本機也能用：`frontend/.env.local` 設定

```
VITE_GITHUB_REPO=<owner>/<repo>
VITE_OAUTH_URL=https://<worker>.workers.dev   # 選填，沒填就只能用 PAT 登入
```

注意：本機後台發文也會直接 commit 到 GitHub 上的 repo，不是寫到本機檔案。

## 驗證改動（每次改前端都要做）

1. 型別檢查 + build：`cd frontend && npm run build`（`tsc --noEmit` 失敗就先修）
2. 啟動 preview 並截圖：

```bash
cd frontend && (npx vite preview --port 4173 >/dev/null 2>&1 &) && sleep 2
chromium --headless=new --disable-gpu --hide-scrollbars --window-size=1280,1400 \
  --virtual-time-budget=4000 --screenshot=<scratchpad>/page.png "http://localhost:4173/#/<route>"
```

   - 路由：`/`、`category/<路徑>`、`post/<分類路徑>/<slug>`、`admin`、`admin/edit`
   - 手機版加 `--window-size=390,1200`
   - 截圖存到 scratchpad，不要存進 repo
3. 用 Read 看截圖確認，結束後 `pkill -f "vite preview --port 4173"`

## 慣例

- 樣式全部在 `frontend/src/styles.css`，顏色用 `:root` 的 `--lav-*` 變數（淺紫色基調），不要寫死新顏色
- 路由用 HashRouter（GitHub Pages 沒有 SPA fallback），連結一律用 `<Link to="/...">`
- 後台頁面用 `React.lazy` 拆 chunk，新增後台頁面也照做
- UI 文字用繁體中文
