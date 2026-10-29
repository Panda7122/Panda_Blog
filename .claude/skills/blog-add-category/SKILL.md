---
name: blog-add-category
description: Add, rename, or remove a blog category or sub-category (nav, home cards, admin category picker, content folders). Use when the user wants to change the blog's 分欄 structure.
---

# 新增 / 調整分欄

分類只定義在一個地方：`frontend/src/lib/categories.ts` 的 `categories` 陣列。導覽列、首頁卡片、分類頁、後台的分類下拉選單都從這裡產生。

## 新增

1. 在 `categories` 加一個節點：
   ```ts
   { slug: 'reading', name: 'Reading', icon: '📚', description: '讀書筆記' }
   ```
   子分類放在父節點的 `children`。`slug` 用小寫 kebab-case，它就是資料夾名稱與網址。
2. 建資料夾：`mkdir -p content/posts/<父>/<子>`，放一個 `.gitkeep` 或第一篇文章（git 不追蹤空資料夾）
3. 更新 `.claude/skills/blog-new-post/SKILL.md` 的分類表
4. 用 `blog-dev` skill 驗證導覽列（桌面 hover 下拉 + 手機選單）與首頁卡片

## 改名 / 搬移

- 只改顯示名稱：改 `name`，不用動檔案
- 改 `slug`：要 `git mv content/posts/<舊> content/posts/<新>`，舊網址會失效，先告知使用者
- 把原本沒有子分類的分欄改成有子分類：父層原有的文章要搬到某個子分類，否則後台下拉選單選不到它們

## 刪除

先確認 `content/posts/<路徑>/` 底下有沒有文章，有的話問使用者要搬到哪裡，不要直接刪。

## Music 特例

插入音樂的按鈕由 `isMusicCategory()` 判斷（`music` 或 `music/*`）。如果 Music 之後加了子分類，這個判斷已經涵蓋；若想讓其他分欄也能插入音樂，改這個函式。
