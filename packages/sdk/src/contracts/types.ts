/**
 * Contract-related types for the Lombard SDK.
 *
 * These types define how to interact with smart contracts,
 * separate from the asset catalog which defines what assets exist where.
 */

import type { Abi } from "viem";

import type { ChainId } from "../common/chains";
import type {
  ASSET_ROUTER_ABI,
  BRIDGE_TOKEN_ADAPTER_ABI,
  BTCK_ABI,
  LBTC_ABI,
  NATIVE_LBTC_ABI,
  STLBTC_ABI,
} from "./abis";

/**
 * Address kinds for tokens that have multiple contract addresses.
 *
 * **BTC.b Integration Architecture:**
 *
 * BTC.b on Avalanche uses a dual-contract architecture with both a token contract
 * and an adapter contract serving different purposes:
 *
 * **When to use Token vs Adapter:**
 *
 * - **Token** (`AddressKind.Token`):
 *   - Use for EIP-2612 `permit()` signatures (Stake and Bake)
 *   - Use for querying token balance, symbol, decimals
 *   - Use for standard ERC20 operations (allowance checks, balance queries)
 *   - This is the actual BTC.b ERC20 token contract
 *
 * - **Adapter** (`AddressKind.Adapter`):
 *   - Use for burn/mint/transfer operations via BridgeTokenAdapter
 *   - Use for bridge deposit/withdrawal operations
 *   - Use as spender address when approving tokens for bridge operations
 *   - This adapter serves as an intermediary between BridgeToken and both AssetRouter and Bridge
 *
 * **Important Notes:**
 *
 * 1. **Permit Signatures**: Always use `AddressKind.Token` as the `verifyingContract` in
 *    EIP-2612 permit signatures. The token contract implements the `permit()` function,
 *    not the adapter.
 *
 * 2. **Approvals**: For bridge and redemption operations, users must grant allowance to
 *    the **BridgeTokenAdapter** address, not the vault or bridge contract.
 *
 * 3. **Deposit Address**: For Ledger integration, the token address includes the adapter
 *    address when tweaking deposit addresses.
 */
export enum AddressKind {
  /**
   * The bridge adapter contract address (BridgeTokenAdapter).
   * Used for burn/mint/transfer operations and as the spender for bridge approvals.
   */
  Adapter = "adapter",

  /**
   * The token contract address (standard ERC20).
   * Used for permit signatures, balance queries, and standard ERC20 operations.
   */
  Token = "token",
}

/**
 * Address structure for tokens with both token and adapter addresses.
 * Currently only used by BTC.b on Avalanche chains.
 */
export interface BridgeTokenAddresses {
  /** The bridge adapter contract address (BridgeTokenAdapter) */
  [AddressKind.Adapter]: `0x${string}`;
  /** The token contract address (standard ERC20) */
  [AddressKind.Token]: `0x${string}`;
}

/**
 * Contract version indicating which ABI to use.
 */
export enum ContractVersion {
  /** Legacy LBTC contract (pre-AssetRouter) */
  Legacy = "legacy",
  /** Upgraded contract with AssetRouter support */
  Upgraded = "upgraded",
}

/**
 * Contract types supported by the SDK.
 */
export enum ContractType {
  /** LBTC token contract */
  LBTC = "lbtc",
  /** Native LBTC variant (BTCb on non-Avalanche chains) */
  NativeLBTC = "native_lbtc",
  /** BTCK legacy contract */
  BTCK = "btck",
  /** Bridge Token Adapter (BTCb on Avalanche) */
  BridgeTokenAdapter = "bridge_token_adapter",
  /** Asset Router contract */
  AssetRouter = "asset_router",
  /** Standard ERC20 */
  ERC20 = "erc20",
}

/**
 * ABI type mapping for contract types.
 */
export type ContractAbiMap = {
  [ContractType.LBTC]: typeof LBTC_ABI | typeof STLBTC_ABI;
  [ContractType.NativeLBTC]: typeof NATIVE_LBTC_ABI;
  [ContractType.BTCK]: typeof BTCK_ABI | typeof NATIVE_LBTC_ABI;
  [ContractType.BridgeTokenAdapter]: typeof BRIDGE_TOKEN_ADAPTER_ABI;
  [ContractType.AssetRouter]: typeof ASSET_ROUTER_ABI;
  [ContractType.ERC20]: Abi;
};

/**
 * Information about a contract including its ABI and address.
 */
export interface ContractInfo<T extends ContractType = ContractType> {
  /** The contract ABI */
  abi: ContractAbiMap[T];
  /** The contract address */
  address: `0x${string}`;
  /** The chain ID */
  chainId: ChainId;
  /** The contract type */
  type: T;
  /** The contract version (for upgradeable contracts) */
  version?: ContractVersion;
}

/**
 * Options for getting contract information.
 */
export interface GetContractInfoOptions {
  /** Which address to use for dual-address tokens (default: Token) */
  addressKind?: AddressKind;
  /** Custom RPC URL for upgrade detection */
  rpcUrl?: string;
}
