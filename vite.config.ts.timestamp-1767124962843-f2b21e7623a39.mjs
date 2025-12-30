// vite.config.ts
import path from "path";
import fs from "fs";
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
            const decodedUrl = decodeURIComponent(req.url);
            const filePath = path.join(process.cwd(), decodedUrl);
            try {
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
            } catch (e) {
              console.error("Middleware Error serving:", req.url, e);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9ob3VzZS9wa21cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2hvdXNlL3BrbS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9ob3VzZS9wa20vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiXG5pbXBvcnQgZnMgZnJvbSBcImZzXCIgLy8gQWRkZWQgZnMgaW1wb3J0XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIHtcbiAgICAgIG5hbWU6ICdzZXJ2ZS1zdG9yYWdlJyxcbiAgICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcbiAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgICBpZiAocmVxLnVybD8uc3RhcnRzV2l0aCgnL3N0b3JhZ2UvJykpIHtcbiAgICAgICAgICAgIC8vIERlY29kZSB0aGUgVVJMIHBhdGggdG8gaGFuZGxlIHNwZWNpYWwgY2hhcmFjdGVycyBsaWtlIHNwYWNlc1xuICAgICAgICAgICAgY29uc3QgZGVjb2RlZFVybCA9IGRlY29kZVVSSUNvbXBvbmVudChyZXEudXJsKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksIGRlY29kZWRVcmwpO1xuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhmaWxlUGF0aCkgJiYgZnMubHN0YXRTeW5jKGZpbGVQYXRoKS5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdHRVQsIE9QVElPTlMnKTtcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJywgJ0F1dGhvcml6YXRpb24sIENvbnRlbnQtVHlwZScpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdPUFRJT05TJykge1xuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSAyMDQ7XG4gICAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2ltcGxlIHN0YXRpYyBzZXJ2aW5nIGZvciB0aGUgbWlkZGxld2FyZVxuICAgICAgICAgICAgICAgIGNvbnN0IHN0cmVhbSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0oZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgIHN0cmVhbS5waXBlKHJlcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ01pZGRsZXdhcmUgRXJyb3Igc2VydmluZzonLCByZXEudXJsLCBlKTtcbiAgICAgICAgICAgICAgLy8gRmFsbHRocm91Z2ggdG8gbmV4dCgpIG9yIDUwMCByZXNwb25zZT9cbiAgICAgICAgICAgICAgLy8gSWYgd2UgZXJyb3IgaGVyZSwgaXQncyBzYWZlciB0byBuZXh0KCkgb3IgcmV0dXJuIDUwMFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogdHJ1ZSxcbiAgICBwb3J0OiA1MTczLFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaS9zaW1wbHlwbHVyYWwnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vYXBpLmFwcGFyeWxsaXMuY29tL3YxJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvc2ltcGx5cGx1cmFsLywgJycpLFxuICAgICAgfSxcbiAgICAgICcvYXBpL25vY29iYXNlJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2RiLmhvdXNlb2ZtYXRlcy5zcGFjZS9hcGknLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGlcXC9ub2NvYmFzZS8sICcnKSxcbiAgICAgIH0sXG4gICAgICAnL2FwaS9vbGxhbWEnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vb2xsYW1hLmhvdXNlb2ZtYXRlcy5zcGFjZS9hcGknLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGlcXC9vbGxhbWEvLCAnJyksXG4gICAgICB9LFxuICAgICAgLy8gJy9zdG9yYWdlJzoge1xuICAgICAgLy8gICB0YXJnZXQ6ICdodHRwczovL2RiLmhvdXNlb2ZtYXRlcy5zcGFjZS9zdG9yYWdlJyxcbiAgICAgIC8vICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgLy8gICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvc3RvcmFnZS8sICcnKSxcbiAgICAgIC8vIH0sXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIHJlcG9ydENvbXByZXNzZWRTaXplOiBmYWxzZSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gICAgICAgICAgJ3VpLXZlbmRvcic6IFsnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsICdAcmFkaXgtdWkvcmVhY3Qtc2xvdCcsICdAcmFkaXgtdWkvcmVhY3QtcG9wb3ZlciddLFxuICAgICAgICAgICd1dGlsLXZlbmRvcic6IFsnY2xzeCcsICdkYXRlLWZucycsICdsZWFmbGV0J10sXG4gICAgICAgICAgJ2RuZC12ZW5kb3InOiBbJ0BkbmQta2l0L2NvcmUnLCAnQGRuZC1raXQvdXRpbGl0aWVzJ11cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgY3NzOiB7XG4gICAgZGV2U291cmNlbWFwOiBmYWxzZSxcbiAgICBwcmVwcm9jZXNzb3JPcHRpb25zOiB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgY2hhcnNldDogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogWydyZWFjdCcsICdyZWFjdC1kb20nLCAnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsICdAcmFkaXgtdWkvcmVhY3Qtc2xvdCcsICdAcmFkaXgtdWkvcmVhY3QtcG9wb3ZlcicsICdjbHN4JywgJ2RhdGUtZm5zJywgJ2xlYWZsZXQnLCAnQGRuZC1raXQvY29yZScsICdAZG5kLWtpdC91dGlsaXRpZXMnXSxcbiAgICBleGNsdWRlOiBbXSxcbiAgICBlc2J1aWxkT3B0aW9uczoge1xuICAgICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICB9XG4gIH0sXG4gIGRlZmluZToge1xuICAgICdwcm9jZXNzLmVudic6IHt9XG4gIH1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQStOLE9BQU8sVUFBVTtBQUNoUCxPQUFPLFFBQVE7QUFDZixTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFIbEIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ047QUFBQSxNQUNFLE1BQU07QUFBQSxNQUNOLGdCQUFnQixRQUFRO0FBQ3RCLGVBQU8sWUFBWSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVM7QUFDekMsY0FBSSxJQUFJLEtBQUssV0FBVyxXQUFXLEdBQUc7QUFFcEMsa0JBQU0sYUFBYSxtQkFBbUIsSUFBSSxHQUFHO0FBQzdDLGtCQUFNLFdBQVcsS0FBSyxLQUFLLFFBQVEsSUFBSSxHQUFHLFVBQVU7QUFFcEQsZ0JBQUk7QUFDRixrQkFBSSxHQUFHLFdBQVcsUUFBUSxLQUFLLEdBQUcsVUFBVSxRQUFRLEVBQUUsT0FBTyxHQUFHO0FBQzlELG9CQUFJLFVBQVUsK0JBQStCLEdBQUc7QUFDaEQsb0JBQUksVUFBVSxnQ0FBZ0MsY0FBYztBQUM1RCxvQkFBSSxVQUFVLGdDQUFnQyw2QkFBNkI7QUFFM0Usb0JBQUksSUFBSSxXQUFXLFdBQVc7QUFDNUIsc0JBQUksYUFBYTtBQUNqQixzQkFBSSxJQUFJO0FBQ1I7QUFBQSxnQkFDRjtBQUdBLHNCQUFNLFNBQVMsR0FBRyxpQkFBaUIsUUFBUTtBQUMzQyx1QkFBTyxLQUFLLEdBQUc7QUFDZjtBQUFBLGNBQ0Y7QUFBQSxZQUNGLFNBQVMsR0FBRztBQUNWLHNCQUFRLE1BQU0sNkJBQTZCLElBQUksS0FBSyxDQUFDO0FBQUEsWUFHdkQ7QUFBQSxVQUNGO0FBQ0EsZUFBSztBQUFBLFFBQ1AsQ0FBQztBQUFBLE1BQ0g7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wscUJBQXFCO0FBQUEsUUFDbkIsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsd0JBQXdCLEVBQUU7QUFBQSxNQUM1RDtBQUFBLE1BQ0EsaUJBQWlCO0FBQUEsUUFDZixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUNBLFVBQVNBLE1BQUssUUFBUSxvQkFBb0IsRUFBRTtBQUFBLE1BQ3hEO0FBQUEsTUFDQSxlQUFlO0FBQUEsUUFDYixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUNBLFVBQVNBLE1BQUssUUFBUSxrQkFBa0IsRUFBRTtBQUFBLE1BQ3REO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBTUY7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxXQUFXO0FBQUEsSUFDWCxzQkFBc0I7QUFBQSxJQUN0QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixnQkFBZ0IsQ0FBQyxTQUFTLFdBQVc7QUFBQSxVQUNyQyxhQUFhLENBQUMsMEJBQTBCLHdCQUF3Qix5QkFBeUI7QUFBQSxVQUN6RixlQUFlLENBQUMsUUFBUSxZQUFZLFNBQVM7QUFBQSxVQUM3QyxjQUFjLENBQUMsaUJBQWlCLG9CQUFvQjtBQUFBLFFBQ3REO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxLQUFLO0FBQUEsSUFDSCxjQUFjO0FBQUEsSUFDZCxxQkFBcUI7QUFBQSxNQUNuQixLQUFLO0FBQUEsUUFDSCxTQUFTO0FBQUEsTUFDWDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsU0FBUyxhQUFhLDBCQUEwQix3QkFBd0IsMkJBQTJCLFFBQVEsWUFBWSxXQUFXLGlCQUFpQixvQkFBb0I7QUFBQSxJQUNqTCxTQUFTLENBQUM7QUFBQSxJQUNWLGdCQUFnQjtBQUFBLE1BQ2QsV0FBVztBQUFBLElBQ2I7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixlQUFlLENBQUM7QUFBQSxFQUNsQjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiXQp9Cg==
