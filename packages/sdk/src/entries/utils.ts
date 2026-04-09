/**
 * Utility functions - Chains, tokens, conversions
 *
 * Import from '@lombard.finance/sdk/utils' for utility-only functionality.
 */

// Environment - exported from sdk-common for type consistency
export { Env } from "@lombard.finance/sdk-common";

// API Config
export { getApiConfig, type IApiConfig } from "../common/api-config";

// Blockchain Identifier
export {
  BlockchainIdentifier,
  getBaseNetworkByEnv,
  getBscNetworkByEnv,
  getChainIdByName,
  getChainNameById,
  getEthNetworkByEnv,
  getSolanaNetworkByEnv,
  getSonicNetworkByEnv,
  getStarknetNetworkByEnv,
  getSuiNetworkByEnv,
} from "../common/blockchain-identifier";

// All chain definitions and utilities
export {
  addChain,
  type AddChainParameters,
  allChains,
  bob,
  bobSepolia,
  CHAIN_ID_TO_LLAMA_CHAIN_NAME_MAP,
  CHAIN_ID_TO_VIEM_CHAIN_MAP,
  ChainId,
  getChain,
  getLlamaChainName,
  isEthereumChain,
  isKatanaChain,
  isMegaethChain,
  isMonadChain,
  isSolanaChain,
  isStableChain,
  isStarknetChainId,
  isSuiChain,
  isValidChain,
  katana,
  megaeth,
  monad,
  SOLANA_DEVNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
  type SolanaChain,
  stable,
  STARKNET_MAINNET_CHAIN,
  STARKNET_SEPOLIA_CHAIN,
  type StarknetChainId,
  SUI_DEVNET_CHAIN,
  SUI_LOCALNET_CHAIN,
  SUI_MAINNET_CHAIN,
  SUI_TESTNET_CHAIN,
  type SuiChain,
  tac,
} from "../common/chains";

// Fee Requirements
export {
  AUTO_MINT_FEE_CHAINS,
  requiresAutoMintFee,
} from "../common/fee-requirements";

// Token utilities - LBTC Addresses
export { getLbtcContractAddresses } from "../tokens/lbtc-addresses";

// Token utilities - Token Addresses
export {
  AddressKind,
  EVM_LBTC_ADDRESSES,
  getSolanaTokenAddress,
  getStarknetTokenAddress,
  getSuiTokenAddress,
  getTokenAddressForChain,
  getTokenByAddress,
  RATIO_TOKEN_MAP,
  type RatioToken,
  SOLANA_TOKEN_ADDRESSES,
  STARKNET_ASSET_ROUTER_ADDRESSES,
  STARKNET_TOKEN_ADDRESSES,
  SUI_TOKEN_ADDRESSES,
  Token,
  TOKEN_ADDRESSES,
  type TokenAddresses,
  type TokenAddressesPerEnv,
} from "../tokens/token-addresses";
export type { BridgeTokenAddresses } from "../tokens/types";

// Token utilities - Token Operations
export {
  fromBaseDenomination,
  getTokenContractInfo,
  isUpgradedAbi,
  retrieveTokenProperties,
  toBaseDenomination,
  type TokenInfo,
} from "../tokens/tokens";

// Satoshi conversions
export {
  BTC_DECIMALS,
  fromSatoshi,
  SATOSHI_SCALE,
  toSatoshi,
  toSatoshiBigInt,
} from "../utils/satoshi";

// RPC URL configuration
export {
  getRpcUrlConfig,
  RPC_URL,
  rpcUrlConfig,
  type TRpcUrlConfig,
} from "../clients/rpc-url-config";

// Common parameters
export {
  type CommonSignerWriteParameters,
  isProviderFlow,
  isSignerFlow,
} from "../common/parameters";

// Error utilities
export {
  getErrorMessage,
  TokenContractAddressNotFoundError,
  UnsupportedTokenFlow,
} from "../utils/err";

// Hex utilities
export { ensureHex, isHex } from "../utils/hex";

// Time utilities
export { DAY, HOUR, MINUTE, now, SECOND, toUnix } from "../utils/time";
