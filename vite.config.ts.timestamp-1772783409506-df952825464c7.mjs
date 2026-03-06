// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { cpSync } from "fs";
var vite_config_default = defineConfig({
  publicDir: false,
  plugins: [
    react(),
    {
      name: "copy-public-assets",
      closeBundle() {
        try {
          cpSync("./public/DOKO_LOGO.jpeg", "./dist/DOKO_LOGO.jpeg");
        } catch {
        }
        try {
          cpSync("./public/vite.svg", "./dist/vite.svg");
        } catch {
        }
      }
    }
  ],
  optimizeDeps: {
    exclude: ["lucide-react"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBjcFN5bmMgfSBmcm9tICdmcyc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwdWJsaWNEaXI6IGZhbHNlLFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICB7XG4gICAgICBuYW1lOiAnY29weS1wdWJsaWMtYXNzZXRzJyxcbiAgICAgIGNsb3NlQnVuZGxlKCkge1xuICAgICAgICB0cnkgeyBjcFN5bmMoJy4vcHVibGljL0RPS09fTE9HTy5qcGVnJywgJy4vZGlzdC9ET0tPX0xPR08uanBlZycpOyB9IGNhdGNoIHt9XG4gICAgICAgIHRyeSB7IGNwU3luYygnLi9wdWJsaWMvdml0ZS5zdmcnLCAnLi9kaXN0L3ZpdGUuc3ZnJyk7IH0gY2F0Y2gge31cbiAgICAgIH0sXG4gICAgfSxcbiAgXSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFDbEIsU0FBUyxjQUFjO0FBR3ZCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFdBQVc7QUFBQSxFQUNYLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOO0FBQUEsTUFDRSxNQUFNO0FBQUEsTUFDTixjQUFjO0FBQ1osWUFBSTtBQUFFLGlCQUFPLDJCQUEyQix1QkFBdUI7QUFBQSxRQUFHLFFBQVE7QUFBQSxRQUFDO0FBQzNFLFlBQUk7QUFBRSxpQkFBTyxxQkFBcUIsaUJBQWlCO0FBQUEsUUFBRyxRQUFRO0FBQUEsUUFBQztBQUFBLE1BQ2pFO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxjQUFjO0FBQUEsRUFDMUI7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
