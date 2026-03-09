import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync } from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  publicDir: false,
  plugins: [
    react(),
    {
      name: 'copy-public-assets',
      closeBundle() {
        try { cpSync('./public/DOKO_LOGO.jpeg', './dist/DOKO_LOGO.jpeg'); } catch {}
        try { cpSync('./public/DOKO_Header.jpeg', './dist/DOKO_Header.jpeg'); } catch {}
        try { cpSync('./public/vite.svg', './dist/vite.svg'); } catch {}
      },
    },
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
