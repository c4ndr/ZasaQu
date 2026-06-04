import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Absolute path agar SPA reload di sub-route tidak blank
  // Capacitor Android pakai http://localhost — absolute path tetap bekerja
  base: '/',
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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('maplibre-gl') || id.includes('react-map-gl') || id.includes('@vis.gl')) return 'vendor-maplibre';
          if (id.includes('react-leaflet') || id.includes('/leaflet/')) return 'vendor-map';
          if (id.includes('@capacitor/')) return 'vendor-capacitor';
          if (id.includes('laravel-echo') || id.includes('pusher-js')) return 'vendor-echo';
          if (id.includes('lucide-react')) return 'vendor-ui';
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('react-router-dom')) return 'vendor-react';
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
})
