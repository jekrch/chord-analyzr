import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => ({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  base: '/',
  esbuild: command === 'build' ? { drop: ['console', 'debugger'] } : undefined,
}));
