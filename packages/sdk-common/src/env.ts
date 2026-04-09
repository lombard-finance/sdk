export const Env = {
  prod: "prod",
  testnet: "testnet",
  stage: "stage",
  dev: "dev",
  ibc: "ibc",
} as const;

export type Env = (typeof Env)[keyof typeof Env];

export const DEFAULT_ENV: Env = Env.prod;
