import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    // ensure older android webviews can execute the bundle (avoids createContext undefined)
    legacy({
      targets: ['Android >= 10', 'Chrome >= 80'],
      modernPolyfills: true,
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 3010,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    hmr: {
      host: '192.168.4.233',
      port: 3010,
      protocol: 'ws',
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
    target: 'es2019',
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
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
    'process.env': {},
    'import.meta.env.VITE_NOCOBASE_API_TOKEN': JSON.stringify(process.env.VITE_NOCOBASE_API_TOKEN || ''),
    'import.meta.env.VITE_PUBLIC_ACCESS_TOKEN': JSON.stringify(process.env.VITE_NOCOBASE_API_TOKEN || ''),
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || '')
  }
})
