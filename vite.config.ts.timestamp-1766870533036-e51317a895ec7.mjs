// vite.config.ts
import path from "path";
import { defineConfig } from "file:///home/house/pkm/node_modules/vite/dist/node/index.js";
import react from "file:///home/house/pkm/node_modules/@vitejs/plugin-react/dist/index.js";
var __vite_injected_original_dirname = "/home/house/pkm";
var vite_config_default = defineConfig({
  plugins: [react()],
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
      },
      "/storage": {
        target: "https://db.houseofmates.space/storage",
        changeOrigin: true,
        rewrite: (path2) => path2.replace(/^\/storage/, "")
      }
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9ob3VzZS9wa21cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2hvdXNlL3BrbS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9ob3VzZS9wa20vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogdHJ1ZSxcbiAgICBwb3J0OiA1MTczLFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaS9zaW1wbHlwbHVyYWwnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vYXBpLmFwcGFyeWxsaXMuY29tL3YxJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvc2ltcGx5cGx1cmFsLywgJycpLFxuICAgICAgfSxcbiAgICAgICcvYXBpL25vY29iYXNlJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2RiLmhvdXNlb2ZtYXRlcy5zcGFjZS9hcGknLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGlcXC9ub2NvYmFzZS8sICcnKSxcbiAgICAgIH0sXG4gICAgICAnL2FwaS9vbGxhbWEnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vb2xsYW1hLmhvdXNlb2ZtYXRlcy5zcGFjZS9hcGknLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGlcXC9vbGxhbWEvLCAnJyksXG4gICAgICB9LFxuICAgICAgJy9zdG9yYWdlJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2RiLmhvdXNlb2ZtYXRlcy5zcGFjZS9zdG9yYWdlJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvc3RvcmFnZS8sICcnKSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIHJlcG9ydENvbXByZXNzZWRTaXplOiBmYWxzZSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gICAgICAgICAgJ3VpLXZlbmRvcic6IFsnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsICdAcmFkaXgtdWkvcmVhY3Qtc2xvdCcsICdAcmFkaXgtdWkvcmVhY3QtcG9wb3ZlciddLFxuICAgICAgICAgICd1dGlsLXZlbmRvcic6IFsnY2xzeCcsICdkYXRlLWZucycsICdsZWFmbGV0J10sXG4gICAgICAgICAgJ2RuZC12ZW5kb3InOiBbJ0BkbmQta2l0L2NvcmUnLCAnQGRuZC1raXQvdXRpbGl0aWVzJ11cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgY3NzOiB7XG4gICAgZGV2U291cmNlbWFwOiBmYWxzZSxcbiAgICBwcmVwcm9jZXNzb3JPcHRpb25zOiB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgY2hhcnNldDogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogWydyZWFjdCcsICdyZWFjdC1kb20nLCAnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsICdAcmFkaXgtdWkvcmVhY3Qtc2xvdCcsICdAcmFkaXgtdWkvcmVhY3QtcG9wb3ZlcicsICdjbHN4JywgJ2RhdGUtZm5zJywgJ2xlYWZsZXQnLCAnQGRuZC1raXQvY29yZScsICdAZG5kLWtpdC91dGlsaXRpZXMnXSxcbiAgICBleGNsdWRlOiBbXSxcbiAgICBlc2J1aWxkT3B0aW9uczoge1xuICAgICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICB9XG4gIH0sXG4gIGRlZmluZToge1xuICAgICdwcm9jZXNzLmVudic6IHt9XG4gIH1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQStOLE9BQU8sVUFBVTtBQUNoUCxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFGbEIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLHFCQUFxQjtBQUFBLFFBQ25CLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQ0EsVUFBU0EsTUFBSyxRQUFRLHdCQUF3QixFQUFFO0FBQUEsTUFDNUQ7QUFBQSxNQUNBLGlCQUFpQjtBQUFBLFFBQ2YsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsb0JBQW9CLEVBQUU7QUFBQSxNQUN4RDtBQUFBLE1BQ0EsZUFBZTtBQUFBLFFBQ2IsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsa0JBQWtCLEVBQUU7QUFBQSxNQUN0RDtBQUFBLE1BQ0EsWUFBWTtBQUFBLFFBQ1YsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsY0FBYyxFQUFFO0FBQUEsTUFDbEQ7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsV0FBVztBQUFBLElBQ1gsc0JBQXNCO0FBQUEsSUFDdEIsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osZ0JBQWdCLENBQUMsU0FBUyxXQUFXO0FBQUEsVUFDckMsYUFBYSxDQUFDLDBCQUEwQix3QkFBd0IseUJBQXlCO0FBQUEsVUFDekYsZUFBZSxDQUFDLFFBQVEsWUFBWSxTQUFTO0FBQUEsVUFDN0MsY0FBYyxDQUFDLGlCQUFpQixvQkFBb0I7QUFBQSxRQUN0RDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsS0FBSztBQUFBLElBQ0gsY0FBYztBQUFBLElBQ2QscUJBQXFCO0FBQUEsTUFDbkIsS0FBSztBQUFBLFFBQ0gsU0FBUztBQUFBLE1BQ1g7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLFNBQVMsYUFBYSwwQkFBMEIsd0JBQXdCLDJCQUEyQixRQUFRLFlBQVksV0FBVyxpQkFBaUIsb0JBQW9CO0FBQUEsSUFDakwsU0FBUyxDQUFDO0FBQUEsSUFDVixnQkFBZ0I7QUFBQSxNQUNkLFdBQVc7QUFBQSxJQUNiO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sZUFBZSxDQUFDO0FBQUEsRUFDbEI7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogWyJwYXRoIl0KfQo=
