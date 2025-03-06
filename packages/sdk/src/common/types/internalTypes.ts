import { Env } from '@lombard.finance/sdk-common';

export interface IEnvParam {
  /**
   * The environment. Available values are `prod`, `stage` and `testnet`
   *
   * @default 'prod'
   */
  env?: Env;
}
