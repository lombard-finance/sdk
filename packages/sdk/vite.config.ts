import path from 'path';

import { defineConfig } from 'vite';

import packageJson from './package.json';

export default defineConfig({
  plugins: [],
  build: {
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
    },
    rollupOptions: {
      output: [
        {
          format: 'es',
          dir: 'dist',
          entryFileNames: `[name].js`,
          chunkFileNames: `[name].js`,
        },
      ],
      plugins: [],
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: [...Object.keys(packageJson.peerDependencies)],
    },
  },
});
