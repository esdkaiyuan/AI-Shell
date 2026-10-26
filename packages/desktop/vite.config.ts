import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 拆出体积大的第三方依赖，避免单个 chunk 超过 500kB 警告阈值
        manualChunks: {
          xterm: ['xterm', 'xterm-addon-fit', 'xterm-addon-search', 'xterm-addon-web-links'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
});
