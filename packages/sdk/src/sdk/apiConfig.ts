import { defaultEnv } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';

interface IApiConfig {
  baseApiUrl: string;
}

const stageConfig: IApiConfig = {
  baseApiUrl: 'https://staging.prod.lombard.finance',
};

const testnetConfig: IApiConfig = {
  baseApiUrl: 'https://gastald-testnet.prod.lombard.finance',
};

const prodConfig: IApiConfig = {
  baseApiUrl: 'https://mainnet.prod.lombard.finance',
};

export const getApiConfig = (env: Env = defaultEnv): IApiConfig => {
  switch (env) {
    case Env.prod:
      return prodConfig;
    case Env.testnet:
      return testnetConfig;
    default:
      return stageConfig;
  }
};
