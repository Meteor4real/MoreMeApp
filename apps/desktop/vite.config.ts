import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: "electron/main.ts",
        vite: {
          build: {
            rollupOptions: {
              // native pty — keep external, load at runtime.
              external: ["@homebridge/node-pty-prebuilt-multiarch", "electron"],
            },
          },
        },
      },
      preload: {
        input: "electron/preload.ts",
        vite: {
          build: {
            rollupOptions: {
              output: { format: "cjs", entryFileNames: "preload.js" },
              external: ["electron"],
            },
          },
        },
      },
      renderer: {},
    }),
  ],
});
