import path from "node:path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

import { defineConfig } from "vite";

import packageJson from "./package.json";

export default defineConfig({
  plugins: [nodePolyfills()],
  build: {
    sourcemap: false,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
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
      plugins: [],
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: [...Object.keys(packageJson.peerDependencies)],
    },
  },
});
