import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    proxy: {
      '/companies': 'http://localhost:3000',
      '/knowledge-graph': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/runs': 'http://localhost:3000',
    },
  },
});
