/**
 * Contract ABIs for interacting with Lombard smart contracts.
 *
 * These ABIs are bundled with the SDK (not in S3) because:
 * - They're code dependencies that generate TypeScript types
 * - They're versioned with the SDK (contract upgrades = new SDK release)
 * - They rarely change independently of code changes
 *
 * For asset addresses and metadata, see `core/assets/` which can be
 * hosted in S3 for dynamic updates without SDK releases.
 */

// Legacy LBTC contract ABI (pre-upgrade)
export { LBTC_ABI } from "../../tokens/abi/LBTC_ABI";

// Upgraded LBTC contract ABI (stLBTC with AssetRouter support)
export { default as STLBTC_ABI } from "../../tokens/abi/STLBTC_ABI";

// Native LBTC ABI (for cross-chain LBTC variants like BTCb on non-Avalanche chains)
export { default as NATIVE_LBTC_ABI } from "../../tokens/abi/NATIVE_LBTC_ABI";

// BTCK ABI (legacy Katana native LBTC)
export { default as BTCK_ABI } from "../../tokens/abi/BTCK_ABI";

// Bridge Token Adapter ABI (for BTC.b on Avalanche)
export { default as BRIDGE_TOKEN_ADAPTER_ABI } from "../../tokens/abi/BRIDGE_TOKEN_ADAPTER_ABI";

// Asset Router ABI (for MARS architecture deposits/redeems)
export { default as ASSET_ROUTER_ABI } from "../../tokens/abi/ASSET_ROUTER_ABI";
