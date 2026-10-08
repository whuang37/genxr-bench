import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    entries: ['index.html'],
    exclude: ['three', 'xrblocks']
  },
  server: {
    port: 5173,
    host: true,
    fs: {
      allow: ['..']
    },
    watch: {
      ignored: ['**/public/jobs/**', '**/public/xrblocks/**']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
