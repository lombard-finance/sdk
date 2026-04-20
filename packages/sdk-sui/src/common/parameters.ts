import { Env } from '@lombard.finance/sdk-common';
import {
  Wallet,
  WalletAccount,
  WalletWithFeatures,
} from '@wallet-standard/base';

type EnvParameter = {
  env?: Env;
};

export interface CommonWriteParameters<WF extends Wallet['features']>
  extends EnvParameter {
  walletClient: WalletWithFeatures<WF>;
  account: WalletAccount;
}
