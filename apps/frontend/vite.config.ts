import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    // Split rarely-changing vendor libraries out of the app bundle so a
    // routine app deploy (new content hash on app code only) lets the
    // browser keep the cached `antd` / `vue-vendor` chunks instead of
    // re-downloading ~1.5 MB every release. Route views are already
    // lazy-loaded; this targets the remaining monolithic main chunk.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Keep xlsx in its own chunk so it stays lazy — only the Excel
          // import/export views (themselves route-lazy) pull it in. Forcing
          // it into a static vendor chunk would make every user download
          // ~360 KB on first load. Return undefined → bundler auto-splits it.
          if (id.includes('xlsx')) return undefined;
          if (id.includes('ant-design-vue') || id.includes('@ant-design')) {
            return 'antd';
          }
          if (
            id.includes('/vue/') ||
            id.includes('/@vue/') ||
            id.includes('vue-router') ||
            id.includes('pinia')
          ) {
            return 'vue-vendor';
          }
          return 'vendor';
        },
      },
    },
    // ant-design-vue は使用コンポーネントのみ登録して ~907 kB raw / ~280 kB
    // gzip（src/plugins/antd.ts）。自前の cacheable チャンクに分けてあるので
    // 少し余裕を持たせつつ、再び全体登録へ戻る等で膨らんだら気付けるよう
    // 1000 kB で止める。(xlsx は lazy な別チャンク — 上の manualChunks 参照)
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@test': resolve(__dirname, 'test'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['agrinews.jp', 'localhost'],
    // Docker Desktop on Mac doesn't forward inotify events from host
    // bind-mounts into the Linux container — HMR won't fire on file
    // changes unless we poll. Adds ~1-2% CPU; only kicks in when the
    // dev server is running.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
});
