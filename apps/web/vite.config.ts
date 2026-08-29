import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Keep the development server local and reject filesystem reads outside it.
    host: '127.0.0.1',
    fs: {
      strict: true,
      deny: ['.env', '.env.*', '*.{crt,pem}'],
    },
  },
});
