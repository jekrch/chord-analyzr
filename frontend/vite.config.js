import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
],
  server: { // Add this server block
    proxy: {
      // String shorthand for simple cases
      '/api': 'http://localhost:8080'
    }
  }
})