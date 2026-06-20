import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const config = {
    plugins: [
      tailwindcss(),
      react()
    ],
    server: {
      proxy: {
        '/api': 'http://localhost:8080'
      }
    },
    base: '/',
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      css: false
    }
  }

  if (command === 'build') {
    config.base = '/'
    // Strip console.* and debugger statements from production bundles.
    config.esbuild = { drop: ['console', 'debugger'] }
  }

  return config
})