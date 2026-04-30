/**
 * EVM Stake Action
 *
 * Exports for the EVM stake action.
 *
 * @module chains/evm/actions/stake
 */

// Main action
export { EvmStake } from './EvmStake';

// Factory functions
export { createEvmStake,evmStake } from './factory';

// Types
export {
  type EvmStakeParams,
  type EvmStakePrepareParams,
  type EvmStakeProgress,
  EvmStakeStatus,
  type IEvmStake } from './types';

// Config (for advanced usage)
export type { ChainConfig, RouteDefinition } from './config';
export {
  evmConfig,
  isProtocolSupported,
  isSourceChainSupported } from './config';
