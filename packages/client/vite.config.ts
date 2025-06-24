/// <reference types="vitest/config" />
/* eslint-disable */
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { ViteUserConfig } from "vitest/config.js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: "stats.html",
      template: "treemap",
    }),
  ],
  server: {
    allowedHosts: true,
  },
  build: {
    target: "esnext",
    minify: "terser",
    rollupOptions: {
      external: ["crypto"],
    },
  },
  envDir: "../../",
  // @ts-expect-error - Vitest config is not typed
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  } satisfies ViteUserConfig["test"],
});
