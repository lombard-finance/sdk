import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import packageJson from "./package.json";

// ESM-compatible __dirname equivalent
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Inject SDK version at build time
  define: {
    __SDK_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [],
  resolve: {
    alias: {
      api: path.resolve(__dirname, "src/api-functions"),
      chains: path.resolve(__dirname, "src/chains"),
      client: path.resolve(__dirname, "src/client"),
      common: path.resolve(__dirname, "src/common"),
      config: path.resolve(__dirname, "src/config"),
      contracts: path.resolve(__dirname, "src/contracts"),
      core: path.resolve(__dirname, "src/core"),
      defi: path.resolve(__dirname, "src/defi"),
      modules: path.resolve(__dirname, "src/modules"),
      registries: path.resolve(__dirname, "src/registries"),
      services: path.resolve(__dirname, "src/services"),
      shared: path.resolve(__dirname, "src/shared"),
      tokens: path.resolve(__dirname, "src/tokens"),
      utils: path.resolve(__dirname, "src/utils"),
      vaults: path.resolve(__dirname, "src/vaults"),
    },
  },
  build: {
    sourcemap: true,
    lib: {
      // Multiple entry points for code splitting
      entry: {
        index: path.resolve(__dirname, "src/index.ts"),
        core: path.resolve(__dirname, "src/entries/core.ts"),
        api: path.resolve(__dirname, "src/entries/api.ts"),
        contracts: path.resolve(__dirname, "src/entries/contracts.ts"),
        btc: path.resolve(__dirname, "src/entries/btc.ts"),
        evm: path.resolve(__dirname, "src/entries/evm.ts"),
        metrics: path.resolve(__dirname, "src/entries/metrics.ts"),
        utils: path.resolve(__dirname, "src/entries/utils.ts"),
        vaults: path.resolve(__dirname, "src/entries/vaults.ts"),
        defi: path.resolve(__dirname, "src/entries/defi.ts"),
        bridge: path.resolve(__dirname, "src/entries/bridge.ts"),
        debug: path.resolve(__dirname, "src/entries/debug.ts"),
      },
    },
    rollupOptions: {
      output: [
        {
          format: "es",
          dir: "dist",
          entryFileNames: "[name].js",
          chunkFileNames: "chunks/[name]-[hash].js",
          minifyInternalExports: false,
        },
        {
          format: "commonjs",
          dir: "dist",
          entryFileNames: "[name].cjs",
          chunkFileNames: "chunks/[name]-[hash].cjs",
        },
      ],
      plugins: [],
      // Externalize peer dependencies (not bundled into SDK)
      external: [
        ...Object.keys(packageJson.peerDependencies),
        // Also externalize subpath imports of peer deps
        /^viem\/.*/,
        /^@layerzerolabs\/.*/,
      ],
    },
  },
});
