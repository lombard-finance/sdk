import { defaultEnv } from '../common/const';
import { OEnv, TEnv } from '../common/types/types';

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

export const getApiConfig = (env: TEnv = defaultEnv): IApiConfig => {
  switch (env) {
    case OEnv.prod:
      return prodConfig;
    case OEnv.testnet:
      return testnetConfig;
    default:
      return stageConfig;
  }
};
