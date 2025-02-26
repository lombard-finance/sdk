export const Env = {
  prod: 'prod',
  testnet: 'testnet',
  stage: 'stage',
} as const;

export type Env = (typeof Env)[keyof typeof Env];
