import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
  ],
  server: {
    host: true,
    port: 3010,
    strictPort: false,
    allowedHosts: ["app.houseofmates.space", "houseofmates.space", ".houseofmates.space"],
    proxy: {
      '/api/broadcast': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/api/chat': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/api/stats': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/api/players': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:4100',
        ws: true,
        changeOrigin: true,
      },
      '/api/simplyplural': {
        target: 'https://api.apparyllis.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/simplyplural/, ''),
      },
      '/api/nocobase': {
        target: 'http://192.168.254.33:8091/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nocobase/, ''),
      },
      // Catch-all for other /api requests
      '/api': {
        target: 'http://192.168.254.33:8091/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/ollama': {
        target: 'https://ollama.houseofmates.space/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
      },
      '/storage': {
        target: 'https://db.houseofmates.space',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    allowedHosts: ["app.houseofmates.space", "houseofmates.space", ".houseofmates.space"],
    port: 3010,
    strictPort: false,
    proxy: {
      '/api/broadcast': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/api/chat': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/api/stats': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/api/players': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:4100',
        ws: true,
        changeOrigin: true,
      },
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
        target: 'https://db.houseofmates.space',
        changeOrigin: true,
        secure: true,
      },
    }
  },
  build: {
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-slot', '@radix-ui/react-popover'],
          'util-vendor': ['clsx', 'date-fns', 'leaflet'],
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/utilities']
        }
      }
    }
  },
  css: {
    devSourcemap: false,
    preprocessorOptions: {
      //   scss: {
      //     charset: false
      //   }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@radix-ui/react-dialog', '@radix-ui/react-slot', '@radix-ui/react-popover', 'clsx', 'date-fns', 'leaflet', '@dnd-kit/core', '@dnd-kit/utilities'],
    exclude: [],
    esbuildOptions: {
      sourcemap: false,
    }
  },
  define: {
    'process.env': {}
  }
})
