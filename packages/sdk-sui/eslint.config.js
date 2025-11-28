import rootConfig from '../../eslint.config.js';

export default [
  ...rootConfig,
  {
    ignores: ['vite.config.ts'],
  },
];
