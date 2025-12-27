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
    sourcemapIgnoreList(sourcePath) {
      return sourcePath.includes("node_modules") || sourcePath.includes(".vite");
    },
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
    sourcemap: false
  },
  css: {
    devSourcemap: false
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9ob3VzZS9wa21cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2hvdXNlL3BrbS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9ob3VzZS9wa20vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogdHJ1ZSxcbiAgICBwb3J0OiA1MTczLFxuICAgIHNvdXJjZW1hcElnbm9yZUxpc3Qoc291cmNlUGF0aCkge1xuICAgICAgcmV0dXJuIHNvdXJjZVBhdGguaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpIHx8IHNvdXJjZVBhdGguaW5jbHVkZXMoJy52aXRlJyk7XG4gICAgfSxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGkvc2ltcGx5cGx1cmFsJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2FwaS5hcHBhcnlsbGlzLmNvbS92MScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaVxcL3NpbXBseXBsdXJhbC8sICcnKSxcbiAgICAgIH0sXG4gICAgICAnL2FwaS9ub2NvYmFzZSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9kYi5ob3VzZW9mbWF0ZXMuc3BhY2UvYXBpJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvbm9jb2Jhc2UvLCAnJyksXG4gICAgICB9LFxuICAgICAgJy9hcGkvb2xsYW1hJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL29sbGFtYS5ob3VzZW9mbWF0ZXMuc3BhY2UvYXBpJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvb2xsYW1hLywgJycpLFxuICAgICAgfSxcbiAgICAgICcvc3RvcmFnZSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9kYi5ob3VzZW9mbWF0ZXMuc3BhY2Uvc3RvcmFnZScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL3N0b3JhZ2UvLCAnJyksXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgc291cmNlbWFwOiBmYWxzZSxcbiAgfSxcbiAgY3NzOiB7XG4gICAgZGV2U291cmNlbWFwOiBmYWxzZSxcbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICB9LFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK04sT0FBTyxVQUFVO0FBQ2hQLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUZsQixJQUFNLG1DQUFtQztBQUt6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sb0JBQW9CLFlBQVk7QUFDOUIsYUFBTyxXQUFXLFNBQVMsY0FBYyxLQUFLLFdBQVcsU0FBUyxPQUFPO0FBQUEsSUFDM0U7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLHFCQUFxQjtBQUFBLFFBQ25CLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQ0EsVUFBU0EsTUFBSyxRQUFRLHdCQUF3QixFQUFFO0FBQUEsTUFDNUQ7QUFBQSxNQUNBLGlCQUFpQjtBQUFBLFFBQ2YsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsb0JBQW9CLEVBQUU7QUFBQSxNQUN4RDtBQUFBLE1BQ0EsZUFBZTtBQUFBLFFBQ2IsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsa0JBQWtCLEVBQUU7QUFBQSxNQUN0RDtBQUFBLE1BQ0EsWUFBWTtBQUFBLFFBQ1YsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsY0FBYyxFQUFFO0FBQUEsTUFDbEQ7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsV0FBVztBQUFBLEVBQ2I7QUFBQSxFQUNBLEtBQUs7QUFBQSxJQUNILGNBQWM7QUFBQSxFQUNoQjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiXQp9Cg==
