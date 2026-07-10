import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';

export interface IApiConfig {
  baseApiUrl: string;
  /**
   * Base URL for the v2 API gateway (`/v2/auth/wallet/*`,
   * `/v2/auth/token/revoke`, …). In production this is a dedicated gateway
   * (`api.lombard.finance`) distinct from `baseApiUrl`; other environments
   * reuse their regular API host.
   */
  baseApiV2Url: string;
  bffApiUrl: string | undefined;
}

const stageConfig: IApiConfig = {
  baseApiUrl: 'https://staging.prod.lombard.finance',
  baseApiV2Url: 'https://api.devnet-stage.lombard-fi.com',
  bffApiUrl: 'https://bff.stage.lombard-fi.com',
};

const testnetConfig: IApiConfig = {
  baseApiUrl: 'https://gastald-testnet.prod.lombard-fi.com',
  baseApiV2Url: 'https://gastald-testnet.prod.lombard-fi.com',
  bffApiUrl: 'https://bff.stage.lombard-fi.com',
};

const prodConfig: IApiConfig = {
  baseApiUrl: 'https://mainnet.prod.lombard.finance',
  baseApiV2Url: 'https://api.lombard.finance',
  bffApiUrl: 'https://bff.prod.lombard-fi.com',
};

const devConfig: IApiConfig = {
  baseApiUrl: 'https://bft-dev.stage.lombard-fi.com',
  baseApiV2Url: 'https://bft-dev.stage.lombard-fi.com',
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
