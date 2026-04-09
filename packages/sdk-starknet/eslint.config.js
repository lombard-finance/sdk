import rootConfig from "../../eslint.config.js";

export default [
  {
    ignores: [
      "vite.config.ts",
      "**/*.stories.tsx",
      "**/*.stories.ts",
      "**/stories/**",
      ".storybook/**",
    ],
  },
  ...rootConfig,
  // Disable react-hooks rules (ESLint 9 compatibility issue)
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];
