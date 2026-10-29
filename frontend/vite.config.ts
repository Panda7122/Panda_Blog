import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 使用相對路徑 + HashRouter，部署在 https://<user>.github.io/<repo>/ 或自訂網域都不需要改設定
export default defineConfig({
  base: './',
  plugins: [react()],
  // content/public 底下的檔案（音樂、圖片）會原封不動複製到網站根目錄
  publicDir: '../content/public',
  build: { chunkSizeWarningLimit: 700 },
  server: {
    fs: { allow: ['..'] },
  },
});
