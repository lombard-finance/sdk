import { Env } from '@lombard.finance/sdk-common';
import { Address, EIP1193Provider } from 'viem';

import { ChainId } from '../../common/chains';
import { StrategyId } from './config';

/**
 * Shared shape for every Strategy SDK call. The caller selects a strategy and
 * an environment; the chain is resolved from that pair (see `resolveStrategy`).
 */
export interface StrategyBaseParameters {
  /**
   * Deployment environment. Selects which chain(s) the strategy resolves to
   * (e.g. `prod` → Ethereum, `stage` → Base Sepolia).
   * @default Env.prod
   */
  env?: Env;
  /**
   * Chain to target when the environment spans multiple chains. Must be one of
   * the strategy's deployed chains for that env; defaults to the primary
   * (first) chain.
   */
  chainId?: ChainId;
  /**
   * Strategy to target. Defaults to the canonical strategy (BTCoc).
   */
  strategyId?: StrategyId;
  /**
   * Explicit Strategy contract address override. Wins over the address
   * resolved from `env` + `strategyId` (targets a different deployment of the
   * same template on the resolved chain).
   */
  strategy?: Address;
  /** Optional RPC URL override for the resolved chain. */
  rpcUrl?: string;
}

/** Base + the account whose position/balances are read. */
export interface StrategyReadParameters extends StrategyBaseParameters {
  account: Address;
}

/** Base + the account and EIP-1193 provider used to sign transactions. */
export interface StrategyWriteParameters extends StrategyBaseParameters {
  account: Address;
  provider: EIP1193Provider;
}
