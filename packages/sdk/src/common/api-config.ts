import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';

export interface IApiConfig {
  /** Base URL for v1 endpoints (`api/v1/...`). */
  baseApiUrl: string;
  /**
   * Base URL for v2 endpoints (`v2/...`). On prod this differs from
   * `baseApiUrl`; on other envs it falls back to `baseApiUrl`.
   */
  v2ApiUrl: string;
  bffApiUrl: string | undefined;
}

// Internal config; `v2ApiUrl` is optional here and defaults to `baseApiUrl`
// in getApiConfig when not set.
type RawApiConfig = Omit<IApiConfig, 'v2ApiUrl'> & { v2ApiUrl?: string };

const stageConfig: RawApiConfig = {
  baseApiUrl: 'https://staging.prod.lombard.finance',
  bffApiUrl: 'https://bff.stage.lombard-fi.com',
};

const testnetConfig: RawApiConfig = {
  baseApiUrl: 'https://gastald-testnet.prod.lombard-fi.com',
  bffApiUrl: 'https://bff.stage.lombard-fi.com',
};

const prodConfig: RawApiConfig = {
  baseApiUrl: 'https://mainnet.prod.lombard.finance',
  // v2 endpoints are served from the dedicated API gateway on prod.
  v2ApiUrl: 'https://api.lombard.finance',
  bffApiUrl: 'https://bff.prod.lombard-fi.com',
};

const devConfig: RawApiConfig = {
  baseApiUrl: 'https://bft-dev.stage.lombard-fi.com',
  // Note, bff on localhost works on 8001
  bffApiUrl: 'https://bff.stage.lombard-fi.com',
};

// IBC environment configuration for Avalanche BTC.b testing
const ibcConfig: RawApiConfig = {
  baseApiUrl: 'https://ibc.stage.lombard-fi.com',
  bffApiUrl: 'https://bff.stage.lombard-fi.com',
};

export const getApiConfig = (env: Env = DEFAULT_ENV): IApiConfig => {
  let config: RawApiConfig;
  switch (env) {
    case Env.dev:
      config = devConfig;
      break;
    case Env.prod:
      config = prodConfig;
      break;
    case Env.testnet:
      config = testnetConfig;
      break;
    case Env.ibc:
      config = ibcConfig;
      break;
    default:
      config = stageConfig;
  }
  // v2 host defaults to the v1 host unless explicitly overridden (prod only).
  return { ...config, v2ApiUrl: config.v2ApiUrl ?? config.baseApiUrl };
};
