import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'Frontend',
  base: process.env.GITHUB_ACTIONS ? '/Pbl_project/' : '/',
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
});