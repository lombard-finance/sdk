import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Hits third-party RPC nodes, kept out of the unit run.
    include: ['src/**/*.live.{test,spec}.{ts,tsx}'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
