import { TEnv } from './types';

export interface IEnvParam {
  /**
   * The environment. Available values are `prod`, `stage` and `testnet`
   */
  env?: TEnv;
}
