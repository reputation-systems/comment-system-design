// vite.config.ts
import { sveltekit } from "file:///home/jse/Escritorio/forum-application/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import { defineConfig } from "file:///home/jse/Escritorio/forum-application/node_modules/vite/dist/node/index.js";
import { readFileSync } from "node:fs";
import path from "path";
function esRawPlugin() {
  return {
    name: "es-raw",
    enforce: "pre",
    load(id) {
      if (!id.endsWith(".es"))
        return null;
      const source = readFileSync(id, "utf-8");
      return `export default ${JSON.stringify(source)};`;
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [esRawPlugin(), sveltekit()],
  test: {
    globals: true,
    environment: "node"
  },
  resolve: {
    alias: {
      $lib: path.resolve("./src/lib")
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".es": "text"
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9qc2UvRXNjcml0b3Jpby9mb3J1bS1hcHBsaWNhdGlvblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvanNlL0VzY3JpdG9yaW8vZm9ydW0tYXBwbGljYXRpb24vdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvanNlL0VzY3JpdG9yaW8vZm9ydW0tYXBwbGljYXRpb24vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBzdmVsdGVraXQgfSBmcm9tICdAc3ZlbHRlanMva2l0L3ZpdGUnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5cbmZ1bmN0aW9uIGVzUmF3UGx1Z2luKCkge1xuXHRyZXR1cm4ge1xuXHRcdG5hbWU6ICdlcy1yYXcnLFxuXHRcdGVuZm9yY2U6ICdwcmUnIGFzIGNvbnN0LFxuXHRcdGxvYWQoaWQ6IHN0cmluZykge1xuXHRcdFx0aWYgKCFpZC5lbmRzV2l0aCgnLmVzJykpIHJldHVybiBudWxsO1xuXHRcdFx0Y29uc3Qgc291cmNlID0gcmVhZEZpbGVTeW5jKGlkLCAndXRmLTgnKTtcblx0XHRcdHJldHVybiBgZXhwb3J0IGRlZmF1bHQgJHtKU09OLnN0cmluZ2lmeShzb3VyY2UpfTtgO1xuXHRcdH1cblx0fTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcblx0cGx1Z2luczogW2VzUmF3UGx1Z2luKCksIHN2ZWx0ZWtpdCgpXSxcblx0dGVzdDoge1xuXHRcdGdsb2JhbHM6IHRydWUsXG5cdFx0ZW52aXJvbm1lbnQ6ICdub2RlJyxcblx0fSxcblx0cmVzb2x2ZToge1xuXHRcdGFsaWFzOiB7XG5cdFx0XHQkbGliOiBwYXRoLnJlc29sdmUoXCIuL3NyYy9saWJcIiksXG5cdFx0fSxcblx0fSxcblx0b3B0aW1pemVEZXBzOiB7XG5cdFx0ZXNidWlsZE9wdGlvbnM6IHtcblx0XHRcdGxvYWRlcjoge1xuXHRcdFx0XHQnLmVzJzogJ3RleHQnLFxuXHRcdFx0fSxcblx0XHR9LFxuXHR9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9TLFNBQVMsaUJBQWlCO0FBQzlULFNBQVMsb0JBQW9CO0FBQzdCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sVUFBVTtBQUVqQixTQUFTLGNBQWM7QUFDdEIsU0FBTztBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sU0FBUztBQUFBLElBQ1QsS0FBSyxJQUFZO0FBQ2hCLFVBQUksQ0FBQyxHQUFHLFNBQVMsS0FBSztBQUFHLGVBQU87QUFDaEMsWUFBTSxTQUFTLGFBQWEsSUFBSSxPQUFPO0FBQ3ZDLGFBQU8sa0JBQWtCLEtBQUssVUFBVSxNQUFNLENBQUM7QUFBQSxJQUNoRDtBQUFBLEVBQ0Q7QUFDRDtBQUVBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzNCLFNBQVMsQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDO0FBQUEsRUFDcEMsTUFBTTtBQUFBLElBQ0wsU0FBUztBQUFBLElBQ1QsYUFBYTtBQUFBLEVBQ2Q7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNSLE9BQU87QUFBQSxNQUNOLE1BQU0sS0FBSyxRQUFRLFdBQVc7QUFBQSxJQUMvQjtBQUFBLEVBQ0Q7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNiLGdCQUFnQjtBQUFBLE1BQ2YsUUFBUTtBQUFBLFFBQ1AsT0FBTztBQUFBLE1BQ1I7QUFBQSxJQUNEO0FBQUEsRUFDRDtBQUNELENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
