---
title: "這個部落格是怎麼架起來的"
date: 2026-10-28
tags: ["GitHub Pages"]
---
- **前端**：Vite + React，build 成靜態網站放在 GitHub Pages
- **後端**：Cloudflare Worker 處理 GitHub OAuth 登入
- **發文**：後台透過 GitHub API 直接 commit Markdown 到 repo，GitHub Actions 自動重新部署
(用claude code生成的)
