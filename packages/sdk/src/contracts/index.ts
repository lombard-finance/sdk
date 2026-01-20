/**
 * Contract module for the Lombard SDK.
 *
 * This module provides everything needed to interact with Lombard smart contracts:
 * - ABIs for all supported contracts
 * - Types for contract interactions
 * - Utilities for determining correct ABIs (handling upgrades, etc.)
 *
 * **Architecture:**
 *
 * The contracts module is separate from the asset catalog (`core/assets/`):
 * - Asset catalog: "What assets exist and where?" (addresses, decimals) - S3-able
 * - Contracts module: "How do I talk to them?" (ABIs, contract types) - bundled
 *
 * **Why ABIs are bundled (not in S3):**
 * - They're code dependencies that generate TypeScript types
 * - Contract upgrades require SDK updates anyway
 * - They're versioned with the SDK
 *
 * @example
 * ```typescript
 * import { getContractInfo, AssetId, Chain } from '@lombard.finance/sdk';
 *
 * // Get contract info (handles upgrade detection)
 * const info = await getContractInfo(AssetId.LBTC, ChainId.ethereum, Env.prod);
 *
 * // Create typed contract
 * const contract = getContract({
 *   address: info.address,
 *   abi: info.abi,
 *   client: publicClient,
 * });
 *
 * // Interact with fully typed methods
 * const balance = await contract.read.balanceOf([userAddress]);
 * ```
 *
 * @module contracts
 */

// ABIs
export * from './abis';

// Types
export {
  AddressKind,
  type BridgeTokenAddresses,
  type ContractAbiMap,
  type ContractInfo,
  ContractType,
  ContractVersion,
  type GetContractInfoOptions,
} from './types';

// Utilities
export {
  getBtckAbi,
  getContractInfo,
  getContractType,
  getLbtcAbi,
  isUpgradedAbi,
  isUpgradedContract,
} from './utils';
