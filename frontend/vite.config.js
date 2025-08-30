import { defineConfig } from 'vite'
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
    base: '/'
  }

  if (command === 'build') {
    config.base = '/'
  }

  return config
})