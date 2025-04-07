import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';

interface IApiConfig {
  baseApiUrl: string;
  bffApiUrl: string | undefined;
}

const stageConfig: IApiConfig = {
  baseApiUrl: 'https://staging.prod.lombard.finance',
  bffApiUrl: 'https://bff.stage.lombard.finance',
};

const testnetConfig: IApiConfig = {
  baseApiUrl: 'https://gastald-testnet.prod.lombard.finance',
  bffApiUrl: undefined,
};

const prodConfig: IApiConfig = {
  baseApiUrl: 'https://mainnet.prod.lombard.finance',
  bffApiUrl: 'https://bff.prod.lombard.finance',
};

export const getApiConfig = (env: Env = DEFAULT_ENV): IApiConfig => {
  switch (env) {
    case Env.prod:
      return prodConfig;
    case Env.testnet:
      return testnetConfig;
    default:
      return stageConfig;
  }
};
