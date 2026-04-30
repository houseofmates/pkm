/* eslint-disable */
import path from "path"
import fs from "fs"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// serve /pkm/* from public/pkm/ as static files (VitePress docs)
// instead of letting the SPA fallback catch them
function pkmWikiPlugin() {
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
  }

  return {
    name: 'pkm-wiki-static',
    configureServer(server: any) {
      // must return a function to run AFTER vite's internal middleware
      // but we actually want to run BEFORE, so we use server.middlewares.use directly
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = (req.url || '').split('?')[0].split('#')[0]
        if (!url.startsWith('/pkm')) return next()

        let filePath: string
        if (url === '/pkm' || url === '/pkm/') {
          filePath = path.join(__dirname, 'public', 'pkm', 'index.html')
        } else {
          filePath = path.join(__dirname, 'public', url)
        }

        // if exact file exists, serve it
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath)
          const mime = mimeTypes[ext] || 'application/octet-stream'
          res.setHeader('Content-Type', mime)
          res.setHeader('Cache-Control', 'no-cache')
          fs.createReadStream(filePath).pipe(res)
          return
        }

        // try .html extension for clean URLs
        if (!path.extname(filePath)) {
          const htmlPath = filePath + '.html'
          const indexPath = path.join(filePath, 'index.html')
          if (fs.existsSync(htmlPath)) {
            res.setHeader('Content-Type', 'text/html')
            res.setHeader('Cache-Control', 'no-cache')
            fs.createReadStream(htmlPath).pipe(res)
            return
          }
          if (fs.existsSync(indexPath)) {
            res.setHeader('Content-Type', 'text/html')
            res.setHeader('Cache-Control', 'no-cache')
            fs.createReadStream(indexPath).pipe(res)
            return
          }
        }

        // fallback: serve VitePress 404.html so the SPA doesn't catch /pkm/* routes
        const fallback404 = path.join(__dirname, 'public', 'pkm', '404.html')
        if (fs.existsSync(fallback404)) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/html')
          res.setHeader('Cache-Control', 'no-cache')
          fs.createReadStream(fallback404).pipe(res)
          return
        }

        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    pkmWikiPlugin(),
    react(),
    // legacy plugin disabled - re-enable for production APK builds with older Android support
    // legacy({
    //   targets: ['Android >= 10', 'Chrome >= 80'],
    //   modernPolyfills: true,
    // }),
  ],
  server: {
    host: '0.0.0.0',
    port: 3010,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    hmr: {
      protocol: process.env.NODE_ENV === 'production' ? 'wss' : 'ws',
      host: process.env.NODE_ENV === 'production' ? 'pkm.houseofmates.space' : 'localhost',
      clientPort: process.env.NODE_ENV === 'production' ? 443 : 3010,
      path: '/vite-hmr',
      overlay: false,
    },
    proxy: {
      '/api/broadcast': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/api/ics-proxy': {
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
      '/api/sidebar-colors': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
            '/api': {
        target: 'http://192.168.4.233:8091/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
'/storage': {
 target: 'http://192.168.4.233:8091',
 changeOrigin: true,
 secure: false,
 },
 '/ollama': {
 target: 'http://192.168.4.250:11434',
 changeOrigin: true,
 rewrite: (path) => path.replace(/^\/ollama/, ''),
 },
 '/hermes-bridge': {
   target: 'ws://127.0.0.1:3101',
   ws: true,
   changeOrigin: true,
   rewrite: (path) => path.replace(/^\/hermes-bridge/, ''),
 },
 '/nvidia': {
 target: 'https://integrate.api.nvidia.com/v1',
 changeOrigin: true,
 rewrite: (path) => path.replace(/^\/nvidia/, ''),
 },
 },
 },
 preview: {
    allowedHosts: true,
    port: 3010,
    strictPort: true,
    proxy: {
      '/api/broadcast': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
      },
      '/api/ics-proxy': {
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
 '/ollama': {
 target: 'http://192.168.4.250:11434',
 changeOrigin: true,
 rewrite: (path) => path.replace(/^\/ollama/, ''),
 },
 '/hermes-bridge': {
   target: 'ws://127.0.0.1:3101',
   ws: true,
   changeOrigin: true,
   rewrite: (path) => path.replace(/^\/hermes-bridge/, ''),
 },
 '/nvidia': {
 target: 'https://integrate.api.nvidia.com/v1',
 changeOrigin: true,
 rewrite: (path) => path.replace(/^\/nvidia/, ''),
 },
 }
 },
 build: {
    target: 'es2019',
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      external: ['@capacitor/push-notifications'],
    output: {
      manualChunks(id) {
        if (id.includes('node_modules')) {
          // react must be in its own self-contained chunk — no circular deps
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/') || id.includes('/scheduler/')) {
            return 'react-vendor';
          }
          // radix ui packages
          if (id.includes('/@radix-ui/')) {
            return 'ui-vendor';
          }
          if (id.includes('/lucide-react/')) return 'icons';
          if (id.includes('/date-fns/')) return 'date-utils';
          if (id.includes('/framer-motion/')) return 'animation';
          if (id.includes('/@dnd-kit/')) return 'dnd';
          if (id.includes('/react-grid-layout/')) return 'grid-layout';
          if (id.includes('/react-quill')) return 'editor';
          if (id.includes('/recharts/')) return 'charts';
          if (id.includes('/fabric/')) return 'canvas';
          if (id.includes('/leaflet/') || id.includes('/react-leaflet/')) return 'maps';
          if (id.includes('/react-markdown/') || id.includes('/remark-gfm/') || id.includes('/rehype-raw/')) return 'markdown';
        }
      }
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
      "@": path.resolve(__dirname, "src"),
      "@pkm/core": path.resolve(__dirname, "src"),
      "src": path.resolve(__dirname, "src")
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
