var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// vite.config.ts
import path from "path";
import { defineConfig } from "file:///home/house/pkm/node_modules/vite/dist/node/index.js";
import react from "file:///home/house/pkm/node_modules/@vitejs/plugin-react/dist/index.js";
var __vite_injected_original_dirname = "/home/house/pkm";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    {
      name: "serve-storage",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith("/storage/")) {
            const fs = __require("fs");
            const path2 = __require("path");
            const filePath = path2.join(process.cwd(), req.url);
            if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
              res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
              if (req.method === "OPTIONS") {
                res.statusCode = 204;
                res.end();
                return;
              }
              const stream = fs.createReadStream(filePath);
              stream.pipe(res);
              return;
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api/simplyplural": {
        target: "https://api.apparyllis.com/v1",
        changeOrigin: true,
        rewrite: (path2) => path2.replace(/^\/api\/simplyplural/, "")
      },
      "/api/nocobase": {
        target: "https://db.houseofmates.space/api",
        changeOrigin: true,
        rewrite: (path2) => path2.replace(/^\/api\/nocobase/, "")
      },
      "/api/ollama": {
        target: "https://ollama.houseofmates.space/api",
        changeOrigin: true,
        rewrite: (path2) => path2.replace(/^\/api\/ollama/, "")
      }
      // '/storage': {
      //   target: 'https://db.houseofmates.space/storage',
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/storage/, ''),
      // },
    }
  },
  build: {
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "ui-vendor": ["@radix-ui/react-dialog", "@radix-ui/react-slot", "@radix-ui/react-popover"],
          "util-vendor": ["clsx", "date-fns", "leaflet"],
          "dnd-vendor": ["@dnd-kit/core", "@dnd-kit/utilities"]
        }
      }
    }
  },
  css: {
    devSourcemap: false,
    preprocessorOptions: {
      css: {
        charset: false
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@radix-ui/react-dialog", "@radix-ui/react-slot", "@radix-ui/react-popover", "clsx", "date-fns", "leaflet", "@dnd-kit/core", "@dnd-kit/utilities"],
    exclude: [],
    esbuildOptions: {
      sourcemap: false
    }
  },
  define: {
    "process.env": {}
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9ob3VzZS9wa21cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2hvdXNlL3BrbS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9ob3VzZS9wa20vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIHtcbiAgICAgIG5hbWU6ICdzZXJ2ZS1zdG9yYWdlJyxcbiAgICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcbiAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgICBpZiAocmVxLnVybD8uc3RhcnRzV2l0aCgnL3N0b3JhZ2UvJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG4gICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCByZXEudXJsKTtcblxuICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZmlsZVBhdGgpICYmIGZzLmxzdGF0U3luYyhmaWxlUGF0aCkuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdHRVQsIE9QVElPTlMnKTtcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdBdXRob3JpemF0aW9uLCBDb250ZW50LVR5cGUnKTtcblxuICAgICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSAyMDQ7XG4gICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIFNpbXBsZSBzdGF0aWMgc2VydmluZyBmb3IgdGhlIG1pZGRsZXdhcmVcbiAgICAgICAgICAgICAgY29uc3Qgc3RyZWFtID0gZnMuY3JlYXRlUmVhZFN0cmVhbShmaWxlUGF0aCk7XG4gICAgICAgICAgICAgIHN0cmVhbS5waXBlKHJlcyk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIF0sXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IHRydWUsXG4gICAgcG9ydDogNTE3MyxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGkvc2ltcGx5cGx1cmFsJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2FwaS5hcHBhcnlsbGlzLmNvbS92MScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaVxcL3NpbXBseXBsdXJhbC8sICcnKSxcbiAgICAgIH0sXG4gICAgICAnL2FwaS9ub2NvYmFzZSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9kYi5ob3VzZW9mbWF0ZXMuc3BhY2UvYXBpJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvbm9jb2Jhc2UvLCAnJyksXG4gICAgICB9LFxuICAgICAgJy9hcGkvb2xsYW1hJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL29sbGFtYS5ob3VzZW9mbWF0ZXMuc3BhY2UvYXBpJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvb2xsYW1hLywgJycpLFxuICAgICAgfSxcbiAgICAgIC8vICcvc3RvcmFnZSc6IHtcbiAgICAgIC8vICAgdGFyZ2V0OiAnaHR0cHM6Ly9kYi5ob3VzZW9mbWF0ZXMuc3BhY2Uvc3RvcmFnZScsXG4gICAgICAvLyAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIC8vICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL3N0b3JhZ2UvLCAnJyksXG4gICAgICAvLyB9LFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICByZXBvcnRDb21wcmVzc2VkU2l6ZTogZmFsc2UsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgICdyZWFjdC12ZW5kb3InOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxuICAgICAgICAgICd1aS12ZW5kb3InOiBbJ0ByYWRpeC11aS9yZWFjdC1kaWFsb2cnLCAnQHJhZGl4LXVpL3JlYWN0LXNsb3QnLCAnQHJhZGl4LXVpL3JlYWN0LXBvcG92ZXInXSxcbiAgICAgICAgICAndXRpbC12ZW5kb3InOiBbJ2Nsc3gnLCAnZGF0ZS1mbnMnLCAnbGVhZmxldCddLFxuICAgICAgICAgICdkbmQtdmVuZG9yJzogWydAZG5kLWtpdC9jb3JlJywgJ0BkbmQta2l0L3V0aWxpdGllcyddXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGNzczoge1xuICAgIGRldlNvdXJjZW1hcDogZmFsc2UsXG4gICAgcHJlcHJvY2Vzc29yT3B0aW9uczoge1xuICAgICAgY3NzOiB7XG4gICAgICAgIGNoYXJzZXQ6IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgIH0sXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ0ByYWRpeC11aS9yZWFjdC1kaWFsb2cnLCAnQHJhZGl4LXVpL3JlYWN0LXNsb3QnLCAnQHJhZGl4LXVpL3JlYWN0LXBvcG92ZXInLCAnY2xzeCcsICdkYXRlLWZucycsICdsZWFmbGV0JywgJ0BkbmQta2l0L2NvcmUnLCAnQGRuZC1raXQvdXRpbGl0aWVzJ10sXG4gICAgZXhjbHVkZTogW10sXG4gICAgZXNidWlsZE9wdGlvbnM6IHtcbiAgICAgIHNvdXJjZW1hcDogZmFsc2UsXG4gICAgfVxuICB9LFxuICBkZWZpbmU6IHtcbiAgICAncHJvY2Vzcy5lbnYnOiB7fVxuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7QUFBK04sT0FBTyxVQUFVO0FBQ2hQLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUZsQixJQUFNLG1DQUFtQztBQUt6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTjtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sZ0JBQWdCLFFBQVE7QUFDdEIsZUFBTyxZQUFZLElBQUksQ0FBQyxL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
