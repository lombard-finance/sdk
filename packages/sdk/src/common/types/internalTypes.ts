import { TEnv } from './types';

export interface IEnvParam {
  /**
   * The environment. Available values are `prod` and `stage`.
   */
  env?: TEnv;
}
