import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api':     { target: 'http://localhost:8000', changeOrigin: true },
      '/sanctum': { target: 'http://localhost:8000', changeOrigin: true },
      '/storage': { target: 'http://localhost:8000', changeOrigin: true },
      '/app':     { target: 'ws://localhost:8080',   ws: true, changeOrigin: true },
    },
  },
})
