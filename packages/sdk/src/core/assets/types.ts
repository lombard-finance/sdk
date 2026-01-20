/**
 * Asset Types
 *
 * Type definitions for the asset catalog.
 * Designed to be JSON-serializable for S3 hosting.
 *
 * @module core/assets/types
 */

import type { Env } from '@lombard.finance/sdk-common';

import type { Chain } from '../chains';

// ═══════════════════════════════════════════════════════════════════════════
// Asset Identifiers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Asset identifiers for all supported assets in the Lombard ecosystem.
 *
 * Naming convention:
 * - Native assets: BTC, ETH, SOL, ZEC, XRP, DOGE
 * - L-Assets (Lombard wrapped): LBTC, L-ETH, L-ZEC, L-XRP, L-DOGE, L-SOL
 * - Wrapped assets: WBTC, BTC.b (Bitcoin on EVM chains)
 */
export const AssetId = {
  // Bitcoin assets
  BTC: 'BTC',
  BTCb: 'BTC.b',
  LBTC: 'LBTC',
  BTCK: 'BTCK',
  cbBTC: 'cbBTC',
  WBTC: 'WBTC',
  WBTCN: 'wBTCN',
  eBTC: 'eBTC',
  BTCBinance: 'BTCB',

  // Solana assets
  SOL: 'SOL',
  L_SOL: 'L-SOL',

  // Sui assets
  SUI: 'SUI',
  L_SUI: 'L-SUI',

  // Ethereum assets
  ETH: 'ETH',
  L_ETH: 'L-ETH',

  // Zcash assets
  ZEC: 'ZEC',
  L_ZEC: 'L-ZEC',

  // XRP assets
  XRP: 'XRP',
  L_XRP: 'L-XRP',

  // Dogecoin assets
  DOGE: 'DOGE',
  L_DOGE: 'L-DOGE',

  // Stablecoin assets (for BSA)
  USDC: 'USDC',
  USDT: 'USDT',
  DAI: 'DAI',
} as const;

export type AssetId = (typeof AssetId)[keyof typeof AssetId];

// ═══════════════════════════════════════════════════════════════════════════
// Catalog Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deployment entry for a specific asset on specific chain(s)
 */
export interface Deployment {
  /** Environment (prod, testnet, stage, dev) */
  env: Env;
  /** Single chain deployment */
  chain?: Chain;
  /** Multi-chain deployment (same address on multiple chains) */
  chains?: Chain[];
  /** Token contract address */
  address: string;
  /** Asset router contract address */
  assetRouter?: string;
  /** Bridge adapter contract address */
  bridgeAdapter?: string;
  /** Public market maker contract address */
  publicMarketMaker?: string;
}

/**
 * Asset entry with metadata and deployments
 */
export interface AssetEntry {
  /** Token decimals */
  decimals: number;
  /** Token symbol */
  symbol: string;
  /** Token display name */
  name?: string;
  /** All deployments for this asset */
  deployments: Deployment[];
}

/**
 * Complete asset catalog structure
 */
export interface AssetCatalog {
  /** Schema version */
  version: string;
  /** Asset definitions keyed by AssetId */
  assets: Partial<Record<AssetId, AssetEntry>>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

/** Convert AssetId value to its key name */
export function assetValueToKey(value: string): string {
  return (
    Object.keys(AssetId).find(
      key => AssetId[key as keyof typeof AssetId] === value,
    ) ?? ''
  );
}

/** Type guard to check if a value is a valid AssetId */
export function isAssetId(value: unknown): value is AssetId {
  return (
    typeof value === 'string' &&
    Object.values(AssetId).includes(value as AssetId)
  );
}

/** Get asset display name */
export function getAssetDisplayName(assetId: AssetId): string {
  return assetId;
}
