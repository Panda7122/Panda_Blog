-- 每篇文章的按讚與匿名留言
-- post 為文章路徑，例如 computer-science/algorithm/directed_hamilton_circuit_2026_10_25
-- visitor 是前端 localStorage 裡的隨機 ID，一個瀏覽器對一篇文章只能按一次讚
--   （不用 IP，因為學校 / 公司網路常常很多人共用同一個 IP）
-- ip_hash 是 IP 加鹽後的 SHA-256，只用來限制同一個 IP 的按讚數與留言頻率，不存原始 IP

CREATE TABLE IF NOT EXISTS likes (
  post       TEXT    NOT NULL,
  visitor    TEXT    NOT NULL,
  ip_hash    TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post, visitor)
);

CREATE INDEX IF NOT EXISTS idx_likes_ip ON likes (post, ip_hash);

CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post       TEXT    NOT NULL,
  name       TEXT    NOT NULL,
  body       TEXT    NOT NULL,
  ip_hash    TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments (post, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_ip ON comments (ip_hash, created_at);
