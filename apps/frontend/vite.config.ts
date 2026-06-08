import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
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
