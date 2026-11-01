import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  base: '/silent-speech/',
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 5173, fs: { allow: ['..'] } },
  preview: { port: 4173 },
});
