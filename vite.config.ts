import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "build/runtime-manifest",
    emptyOutDir: true,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "index.mjs",
    },
    rollupOptions: {
      external: ["@rmc-toolkit/core"],
    },
  },
});
