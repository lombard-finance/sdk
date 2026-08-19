/**
 * BTC DepositAndDeploy Chain Configuration Types
 *
 * BTC DepositAndDeploy: BTC → BTC.b → DeFi vault (Silo)
 *
 * @module chains/btc/actions/depositAndDeploy/config/types
 */

import type { Env } from '@lombard.finance/sdk-common';
import type { z } from 'zod';

import type { AssetId, Chain, DeployProtocol } from '../../../../../core';
import type { BtcCoreContext } from '../../../../../shared/context';

/**
 * Route definition
 */
export interface DepositAndDeployRouteDefinition {
  sourceChains: Chain[];
  envs: Env[];
}

/**
 * Authorization result
 */
export interface DepositAndDeployAuthResult {
  signature: string;
  typedData?: string;
  approvalTxHash?: string;
}

/**
 * DepositAndDeploy chain configuration
 *
 * DepositAndDeploy produces BTC.b then deploys to a vault (e.g., Silo on Avalanche).
 */
export interface DepositAndDeployChainConfig {
  chainType: 'evm';
  routes: DepositAndDeployRouteDefinition[];
  destChains: Chain[];
  /** Supported output assets - DepositAndDeploy produces BTC.b */
  supportedAssetsOut: AssetId[];
  supportedProtocols: DeployProtocol[];
  addressSchema: z.ZodString;

  /**
   * Get deposit and deploy fee for a protocol
   */
  getDepositAndDeployFee: (
    ctx: BtcCoreContext,
    chainId: unknown,
    vaultKey: string,
  ) => Promise<string>;

  /**
   * Authorize deposit and deploy (approve flow for BTC.b)
   */
  authorizeDepositAndDeploy: (
    ctx: BtcCoreContext,
    params: {
      chainId: unknown;
      recipient: string;
      amount: string;
      vaultKey: string;
      token: string;
      // False while the signature is about to travel with generateDepositAddress,
      // which registers it server-side. Registering it twice reads as a reuse.
      storeSignature?: boolean;
    },
  ) => Promise<DepositAndDeployAuthResult>;
}
