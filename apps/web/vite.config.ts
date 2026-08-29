import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { proxy: { '/companies': 'http://127.0.0.1:3000', '/runs': 'http://127.0.0.1:3000', '/knowledge-graph': 'http://127.0.0.1:3000', '/people': 'http://127.0.0.1:3000', '/institutions': 'http://127.0.0.1:3000', '/reports': 'http://127.0.0.1:3000' } },
});
