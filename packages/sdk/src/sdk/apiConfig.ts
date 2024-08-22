import { defaultEnv } from '../common/const';
import { TEnv } from '../common/types/types';

interface IApiConfig {
  depositAddrApiUrl: string;
  baseApiUrl: string;
}

const stageConfig: IApiConfig = {
  depositAddrApiUrl: 'https://staging.prod.lombard.finance',
  baseApiUrl: 'https://staging.prod.lombard.finance',
};

const prodConfig: IApiConfig = {
  depositAddrApiUrl: 'https://consortium.lombard.finance',
  baseApiUrl: 'https://mainnet.prod.lombard.finance',
};

export const getApiConfig = (env: TEnv = defaultEnv): IApiConfig =>
  env === 'prod' ? prodConfig : stageConfig;
