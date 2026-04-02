import path from "node:path";

import { defineConfig } from "vite";

import packageJson from "./package.json";

export default defineConfig({
  build: {
    sourcemap: false,
    lib: {
      entry: {
        index: path.resolve(__dirname, "src/index.ts"),
        ai: path.resolve(__dirname, "src/ai.ts"),
      },
    },
    rollupOptions: {
      output: [
        {
          format: "es",
          dir: "dist",
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
        },
        {
          format: "commonjs",
          dir: "dist",
          entryFileNames: "[name].cjs",
          chunkFileNames: "[name].cjs",
        },
      ],
      external: [
        ...Object.keys(packageJson.peerDependencies),
        "@lombard.finance/sdk",
        "@lombard.finance/sdk-common",
        "ai",
      ],
    },
  },
});
