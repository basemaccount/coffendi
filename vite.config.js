import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset({ compilationMode: "annotation" })] }),
  ],
  server: {
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ["warn", "error"],
    },
  },
  build: {
    target: "baseline-widely-available",
    cssCodeSplit: true,
    minify: "oxc",
  },
});
