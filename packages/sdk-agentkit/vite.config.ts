import path from 'node:path';

import { defineConfig } from 'vite';

import packageJson from './package.json';

export default defineConfig({
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
      external: (id: string) => {
        const deps = [
          ...Object.keys(packageJson.peerDependencies),
          ...Object.keys(packageJson.dependencies),
        ];
        return deps.some(dep => id === dep || id.startsWith(`${dep}/`));
      },
    },
  },
});
