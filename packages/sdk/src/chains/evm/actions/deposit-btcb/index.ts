/**
 * EVM Stake Action
 *
 * Exports for the EVM stake action.
 *
 * @module chains/evm/actions/deposit-btcb
 */

// Main action
export { EvmDepositBtcb } from './EvmDepositBtcb';

// Factory functions
export { createEvmStake, evmStake } from './factory';

// Types
export {
  type EvmDepositBtcbParams,
  type EvmDepositBtcbPrepareParams,
  type EvmDepositBtcbProgress,
  EvmDepositBtcbStatus,
  type IEvmDepositBtcb,
} from './types';

// Config (for advanced usage)
export type { ChainConfig, RouteDefinition } from './config';
export {
  evmConfig,
  isProtocolSupported,
  isSourceChainSupported,
} from './config';
