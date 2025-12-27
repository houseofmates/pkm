import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/simplyplural': {
        target: 'https://api.apparyllis.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/simplyplural/, ''),
      },
      '/api/nocobase': {
        target: 'https://db.houseofmates.space/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nocobase/, ''),
      },
      '/api/ollama': {
        target: 'https://ollama.houseofmates.space/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
      },
      '/storage': {
        target: 'https://db.houseofmates.space/storage',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/storage/, ''),
      },
    },
  },
  build: {
    sourcemap: false,
  },
  css: {
    devSourcemap: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
