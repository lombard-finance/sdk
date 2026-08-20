import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';

export interface IApiConfig {
  baseApiUrl: string;
  /**
   * Base URL for the v2 API gateway (`/v2/auth/wallet/*`,
   * `/v2/auth/token/revoke`, …). Most environments run it as a dedicated
   * gateway distinct from `baseApiUrl` (`api.lombard.finance`,
   * `api.testnet.lombard-fi.com`, `api.devnet-bft.lombard-fi.com`); only
   * stage and ibc reuse their regular API host.
   */
  baseApiV2Url: string;
  bffApiUrl: string | undefined;
}

const stageConfig: IApiConfig = {
  baseApiUrl: 'https://staging.prod.lombard.finance',
  baseApiV2Url: 'https://staging.prod.lombard.finance',
  bffApiUrl: 'https://bff.stage.lombard-fi.com',
};

const testnetConfig: IApiConfig = {
  baseApiUrl: 'https://gastald-testnet.prod.lombard-fi.com',
  baseApiV2Url: 'https://api.testnet.lombard-fi.com',
  bffApiUrl: 'https://bff.stage.lombard-fi.com',
};

const prodConfig: IApiConfig = {
  baseApiUrl: 'https://mainnet.prod.lombard.finance',
  baseApiV2Url: 'https://api.lombard.finance',
  bffApiUrl: 'https://bff.prod.lombard-fi.com',
};

const devConfig: IApiConfig = {
  baseApiUrl: 'https://bft-dev.stage.lombard-fi.com',
  // The dev v1 host does not serve `/v2/*` (404); v2 lives on its own gateway.
  baseApiV2Url: 'https://api.devnet-bft.lombard-fi.com',
  // Note, bff on localhost works on 8001
  bffApiUrl: 'https://bff.stage.lombard-fi.com',
};

// IBC environment configuration for Avalanche BTC.b testing
const ibcConfig: IApiConfig = {
  baseApiUrl: 'https://ibc.stage.lombard-fi.com',
  baseApiV2Url: 'https://ibc.stage.lombard-fi.com',
  bffApiUrl: 'https://bff.stage.lombard-fi.com',
};

export const getApiConfig = (env: Env = DEFAULT_ENV): IApiConfig => {
  switch (env) {
    case Env.dev:
      return devConfig;
    case Env.prod:
      return prodConfig;
    case Env.testnet:
      return testnetConfig;
    case Env.ibc:
      return ibcConfig;
    default:
      return stageConfig;
  }
};

/** Cap wallet-auth requests so a stalled backend can't hang the flow. */
export const WALLET_AUTH_REQUEST_TIMEOUT_MS = 20_000;
