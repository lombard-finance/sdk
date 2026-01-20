import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

import packageJson from './package.json';

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
      api: path.resolve(__dirname, 'src/api-functions'),
      chains: path.resolve(__dirname, 'src/chains'),
      client: path.resolve(__dirname, 'src/client'),
      common: path.resolve(__dirname, 'src/common'),
      config: path.resolve(__dirname, 'src/config'),
      contracts: path.resolve(__dirname, 'src/contracts'),
      core: path.resolve(__dirname, 'src/core'),
      defi: path.resolve(__dirname, 'src/defi'),
      modules: path.resolve(__dirname, 'src/modules'),
      registries: path.resolve(__dirname, 'src/registries'),
      services: path.resolve(__dirname, 'src/services'),
      shared: path.resolve(__dirname, 'src/shared'),
      tokens: path.resolve(__dirname, 'src/tokens'),
      utils: path.resolve(__dirname, 'src/utils'),
      vaults: path.resolve(__dirname, 'src/vaults'),
    },
  },
  build: {
    sourcemap: false,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
    },
    rollupOptions: {
      output: [
        {
          format: 'es',
          dir: 'dist',
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
        },
        {
          format: 'commonjs',
          dir: 'dist',
          entryFileNames: '[name].cjs',
          chunkFileNames: '[name].cjs',
        },
      ],
      plugins: [],
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: [...Object.keys(packageJson.peerDependencies)],
    },
  },
});
