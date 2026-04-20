import { Env } from '@lombard.finance/sdk';

/**
 * Get SDK environment from environment variable
 */
export function getEnvironment(): Env {
  const env = import.meta.env.VITE_ENV as string;

  switch (env) {
    case 'prod':
      return Env.prod;
    case 'testnet':
      return Env.testnet;
    case 'stage':
    default:
      return Env.stage;
  }
}

/**
 * Get partner ID from environment variable
 */
export function getPartnerId(): string | undefined {
  return import.meta.env.VITE_PARTNER_ID as string | undefined;
}
