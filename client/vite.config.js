import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // HMR via nginx :8085; host = browser hostname (VM IP from Windows)
    hmr: {
      clientPort: 8085,
      protocol: 'ws',
    },
    proxy: {
      '/api': { target: 'http://127.0.0.1:3847', changeOrigin: true },
    },
  },
});
