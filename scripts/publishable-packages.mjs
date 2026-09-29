// Publishable packages in dependency order. Keep in sync with the `package`
// input in .github/workflows/publish.yml and scripts/check-publish-deps.js.
export const PUBLISH_ORDER = [
  'sdk-common',
  'sdk',
  'sdk-solana',
  'sdk-sui',
  'sdk-starknet',
  'sdk-devtools',
  'sdk-agent',
  'sdk-agentkit',
  'sdk-react',
];

export const PUBLISHABLE = new Set(PUBLISH_ORDER);

export const SCOPE = '@lombard.finance/';
