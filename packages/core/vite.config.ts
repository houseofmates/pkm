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
    strictPort: true,
    allowedHosts: ["app.houseofmates.space", "houseofmates.space", ".houseofmates.space", "pkm.houseofmates.space", "dupe.houseofmates.space"],
    hmr: {
      protocol: 'wss',
      clientPort: 443,
    },
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
        target: 'http://192.168.4.233:8091/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nocobase/, ''),
      },
      '/api/nb-import-csv': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/api/notion-import': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/api/nb-import': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://192.168.4.233:8091/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/ollama': {
        target: 'http://localhost:11434/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
      },
      '/storage': {
        target: 'http://192.168.4.233:8091',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    allowedHosts: ["app.houseofmates.space", "houseofmates.space", ".houseofmates.space", "dupe.houseofmates.space"],
    port: 3010,
    strictPort: true,
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
      '/api/nb-import-csv': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/api/notion-import': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/api/nb-import': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/api/nocobase': {
        target: 'http://192.168.4.233:8091/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nocobase/, ''),
      },
      '/api/ollama': {
        target: 'http://localhost:11434/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
      },
      '/storage': {
        target: 'http://192.168.4.233:8091',
        changeOrigin: true,
        secure: false,
      },
    }
  },
  build: {
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-slot',
            '@radix-ui/react-popover',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select'
          ],
          'canvas-vendor': ['fabric'],
          'editor-vendor': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-mention',
            '@tiptap/extension-image',
            '@tiptap/extension-placeholder'
          ],
          'motion-vendor': ['framer-motion'],
          'viz-vendor': ['recharts', 'react-force-graph-2d'],
          'util-vendor': ['clsx', 'date-fns', 'leaflet', 'lodash', 'axios', 'uuid', 'zod'],
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/utilities', '@dnd-kit/sortable'],
          'monaco-vendor': ['@monaco-editor/react'],
          'pdf-vendor': ['pdfjs-dist', 'jspdf'],
          'lucide-vendor': ['lucide-react']
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
      "@pkm/core": path.resolve(__dirname, "./src")
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@radix-ui/react-dialog', '@radix-ui/react-slot', '@radix-ui/react-popover', 'clsx', 'date-fns', 'leaflet', '@dnd-kit/core', '@dnd-kit/utilities', 'rehype-raw'],
    exclude: [],
    esbuildOptions: {
      sourcemap: false,
    }
  },
  define: {
    'process.env': {}
  }
})
