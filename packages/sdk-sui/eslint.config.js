import rootConfig from '../../eslint.config.js';

export default [
  ...rootConfig,
  {
    ignores: ['vite.config.ts'],
  },
  {
    // The repository standard is no-console, but the root config does not
    // enable it and turning it on there would fail the packages that log by
    // design. This package has no logging of its own, so it holds the rule.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'error',
    },
  },
  {
    // The live tests report which public endpoints did not answer, which is
    // most of the reason to run them by hand.
    files: ['src/**/*.live.{test,spec}.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },
];
