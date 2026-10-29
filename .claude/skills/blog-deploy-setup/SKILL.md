---
name: blog-deploy-setup
description: Walk the user through deploying this blog to GitHub Pages and wiring the GitHub OAuth backend (GitHub OAuth App + Cloudflare Worker + repo variables). Use when the user asks how to deploy/publish the site, set up admin login, or when GitHub login/deploy is broken.
---

# 部署與後台登入設定

整體流程：後台用 GitHub token 呼叫 Contents API commit 到 repo → push 觸發 `.github/workflows/deploy.yml` → build `frontend/` → 部署到 Pages。

這些步驟大多要在使用者的帳號上操作（建立 repo、OAuth App、Cloudflare 登入、secret），要一步一步帶使用者做，**不要自己 push、建立 repo 或寫入 secret，除非使用者明確要求**。能用 `gh` CLI 的步驟可以提議代為執行，先取得同意。

## 1. 推上 GitHub

- 建立 **public** repo（免費方案的 Pages 需要 public），把專案 push 到 `main`
- Settings → Pages → Build and deployment → Source 選 **GitHub Actions**
- 第一次 push 後 Actions 會自動部署，網址是 `https://<user>.github.io/<repo>/`
- 確認 `frontend/package-lock.json` 有 commit（workflow 用 `npm ci`）

此時已經可以用 **Personal Access Token** 登入後台：
Fine-grained token → 只選這個 repo → Contents: Read and write、Actions: Read-only。

## 2. 「使用 GitHub 登入」按鈕（OAuth，選用但建議）

GitHub OAuth 的 client secret 不能放前端，所以需要 `worker/` 這個小後端。

1. GitHub → Settings → Developer settings → OAuth Apps → New
   - Homepage URL：`https://<user>.github.io/<repo>/`
   - Authorization callback URL：`https://<worker 名稱>.<帳號>.workers.dev/callback`
2. 部署 Worker：
   ```bash
   cd worker && npm install
   npx wrangler login
   # 編輯 wrangler.toml：ALLOWED_USER、ALLOWED_ORIGINS（https://<user>.github.io，不含路徑）
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   npx wrangler deploy
   ```
3. repo → Settings → Secrets and variables → Actions → **Variables**：
   - `OAUTH_URL` = Worker 網址（不含結尾 `/`）
   - `SITE_TITLE` = 網站名稱（選填）
4. Actions → 重新執行部署（或 push 任一 commit），登入頁就會出現 GitHub 按鈕

## 自動帶入的設定

workflow 會自動設定 `VITE_GITHUB_REPO`（= 這個 repo）、`VITE_GITHUB_BRANCH`、`VITE_ADMIN_USER`（= repo 擁有者）。repo 屬於 organization 時，`VITE_ADMIN_USER` 要改成個人帳號。

## 疑難排解

| 症狀 | 原因 / 解法 |
| --- | --- |
| 登入後「不是這個部落格的站長」 | 登入的帳號 ≠ `VITE_ADMIN_USER`；或 Worker 的 `ALLOWED_USER` 打錯 |
| 彈窗顯示 Origin not allowed | `ALLOWED_ORIGINS` 少了前端 origin（本機是 `http://localhost:5173`） |
| redirect_uri mismatch | OAuth App 的 callback URL 和 Worker 網址不一致 |
| 發文 404 / 403 | token 沒有該 repo 的 Contents 寫入權限；私有 repo 要把 `OAUTH_SCOPE` 改成 `repo` |
| 發文成功但網站沒更新 | 看 Actions；Pages Source 必須是 GitHub Actions |
| 網站空白 / 資源 404 | `vite.config.ts` 的 `base` 必須維持 `'./'` |
