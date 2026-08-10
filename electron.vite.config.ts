import {resolve} from "node:path";
import {defineConfig, externalizeDepsPlugin} from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve("src/main/index.ts"),
          "render-worker": resolve("src/main/render-worker.ts"),
        },
        output: {
          entryFileNames: "[name].js",
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: resolve("src/renderer"),
    plugins: [react()],
  },
});
