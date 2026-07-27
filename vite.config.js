import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    cssMinify: "lightningcss",
    minify: "terser",
    terserOptions: {
      ecma: 2022,
      module: true,
      toplevel: true,
      compress: {
        passes: 2,
        pure_getters: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
            return "react-vendor";
          }
          if (id.includes("d3-geo") || id.includes("topojson-client") || id.includes("world-atlas")) {
            return "map-vendor";
          }
          if (id.includes("lucide-react")) return "icons-vendor";
          return "vendor";
        },
      },
    },
  },
});
