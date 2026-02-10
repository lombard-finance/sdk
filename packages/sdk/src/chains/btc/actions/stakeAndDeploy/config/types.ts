/**
 * BTC StakeAndDeploy Chain Configuration Types
 *
 * BTC StakeAndDeploy: BTC → LBTC → DeFi vault
 *
 * @module chains/btc/actions/stakeAndDeploy/config/types
 */

import type { Env } from '@lombard.finance/sdk-common';
import type { z } from 'zod';

import type { AssetId, Chain, DeployProtocol } from '../../../../../core';
import type { BtcCoreContext } from '../../../../../shared/context';

/**
 * Route definition
 */
export interface StakeAndDeployRouteDefinition {
  sourceChains: Chain[];
  envs: Env[];
}

/**
 * Authorization result
 */
export interface StakeAndBakeAuthResult {
  signature: string;
  typedData?: string;
}

/**
 * Result from restoring existing stake and bake signature
 */
export interface StakeAndBakeRestoreResult {
  /** Whether a valid signature exists on the server */
  hasSignature: boolean;
  /** The signature (may be undefined even if hasSignature is true) */
  signature?: string;
  /** The deposit amount from the existing signature */
  depositAmount?: string;
  /** Expiration date (Unix timestamp) */
  expirationDate?: string;
}

/**
 * StakeAndDeploy chain configuration
 *
 * StakeAndDeploy produces LBTC then deploys to a vault.
 */
export interface StakeAndDeployChainConfig {
  chainType: 'evm';
  routes: StakeAndDeployRouteDefinition[];
  destChains: Chain[];
  /** Supported output assets - StakeAndDeploy produces LBTC */
  supportedAssetsOut: AssetId[];
  supportedProtocols: DeployProtocol[];
  addressSchema: z.ZodString;

  /**
   * Get stake and bake fee for a protocol
   */
  getStakeAndBakeFee: (
    ctx: BtcCoreContext,
    chainId: unknown,
    vaultKey: string,
  ) => Promise<string>;

  /**
   * Authorize stake and bake (EIP-712 signing)
   */
  authorizeStakeAndBake: (
    ctx: BtcCoreContext,
    params: {
      chainId: unknown;
      recipient: string;
      amount: string;
      vaultKey: string;
      token: string;
    },
  ) => Promise<StakeAndBakeAuthResult>;

  /**
   * Restore existing stake and bake signature from the server.
   * Used to check if a valid unexpired signature already exists,
   * allowing the action to skip the signing step.
   *
   * @returns null if no valid signature exists, otherwise the restore result
   */
  restoreStakeAndBakeSignature: (
    ctx: BtcCoreContext,
    chainId: unknown,
    recipient: string,
  ) => Promise<StakeAndBakeRestoreResult | null>;
}
