import rootConfig from '../../eslint.config.js';

export default [
  {
    ignores: [
      'dist/**',
      'test-results/**',
      'scripts/**',
      '**/*.stories.tsx',
      '**/*.stories.ts',
      '**/stories/**',
      'sdk-docs/**',
      'sdk-storybook/**',
      'vite.config.ts',
      '.storybook/**',
    ],
  },
  ...rootConfig,
  // Disable react-hooks rules (ESLint 9 compatibility issue)
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
];
