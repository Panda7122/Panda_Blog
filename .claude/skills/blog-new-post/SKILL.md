---
name: blog-new-post
description: Create or edit a blog post in this repo (content/posts/<category>/<slug>.md) with correct frontmatter, category path, media, and the ```music block. Use when the user asks to write, draft, add, move, or fix a post, or to insert music/images into one.
---

# 新增 / 編輯文章

文章是 `content/posts/<分類路徑>/<slug>.md`，build 時被 `frontend/src/lib/posts.ts` 打包。分類路徑決定文章屬於哪個分欄。

## 1. 選分類路徑（只能放在葉節點）

| 分欄 | 路徑 |
| --- | --- |
| Coffee | `coffee` |
| Sport / Badminton | `sport/badminton` |
| Sport / Other | `sport/other` |
| Music | `music` |
| Computer Science / Algorithm | `computer-science/algorithm` |
| Computer Science / MIR | `computer-science/mir` |
| Computer Science / System | `computer-science/system` |
| Drawing | `drawing` |

這張表的真實來源是 `frontend/src/lib/categories.ts`；若兩者不一致，以程式碼為準並更新這張表。不要放在 `sport/`、`computer-science/` 這種有子分類的父層，網站不會顯示。

## 2. 檔名（slug）

- 只用英數字、`-`、`_`、中文（後台的驗證規則是 `^[\w\-一-鿿]+$`）
- 優先用英文 kebab-case，例如 `v60-brew-ratio.md`
- 同分類下不可重複；先 `ls content/posts/<分類>/` 確認

## 3. Frontmatter 格式

格式必須和 `frontend/src/lib/frontmatter.ts` 的 `stringifyPost` 一致，字串用 JSON 雙引號，陣列用 JSON：

```markdown
---
title: "文章標題"
date: 2026-10-29
tags: ["標籤一", "標籤二"]
summary: "選填，沒填會自動截取內文"
cover: "media/xxx.jpg"
draft: true
---
內文從這裡開始（不要再寫一個 # 標題，頁面會自動顯示 title）
```

- `title`、`date`（YYYY-MM-DD）、`tags` 必填；`summary`、`cover`、`draft` 沒用到就整行省略
- `draft: true` 的文章不會出現在網站上

## 4. 圖片與音檔

- 檔案放 `content/public/media/`，檔名建議 `<timestamp>-<原檔名>`
- 文章內引用 `media/<檔名>`（相對路徑，不要加開頭的 `/`，網站用 HashRouter + `base: './'`）
- 單檔不要超過 50MB（後台上傳的上限，也避免 repo 膨脹）

## 5. 音樂（僅 Music 分類）

需求規定只有 Music 分欄的文章能插入音樂，後台的「插入音樂」按鈕也只在 Music 分類出現。只在 `music` 路徑底下的文章使用：

````markdown
```music
title: 曲名
artist: 演出者
src: media/1730000000000-song.mp3
cover: media/1730000000000-cover.jpg
```
````

- `src` 可以是音檔（mp3/wav/ogg/m4a/flac → 自訂播放器）、YouTube、Spotify（track/album/playlist）、SoundCloud 網址（→ 內嵌 iframe）
- 只有 `src` 必填；`cover` 只對音檔播放器有效
- 解析邏輯在 `frontend/src/components/MusicBlock.tsx`；新增平台支援時改 `detectEmbed`

## 6. 驗證

```bash
cd frontend && npm run build
```

build 成功後可用 `blog-dev` skill 的截圖流程確認 `#/post/<分類路徑>/<slug>` 正常顯示。commit/push 前先問使用者；push 到 main 會自動部署。
