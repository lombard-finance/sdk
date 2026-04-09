/**
 * EVM Deposit Action
 *
 * @module chains/evm/actions/deposit
 */

export type { ChainConfig, RouteDefinition } from "./config";
export { evmConfig, isDepositSupported } from "./config";
export { EvmDeposit } from "./EvmDeposit";
export { createEvmDeposit, evmDeposit } from "./factory";
export {
  type EvmDepositParams,
  type EvmDepositPrepareParams,
  type EvmDepositProgress,
  EvmDepositStatus,
  type IEvmDeposit,
} from "./types";
