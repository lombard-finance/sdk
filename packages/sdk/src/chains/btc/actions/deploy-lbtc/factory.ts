/**
 * BTC StakeAndDeploy Factory Functions
 *
 * Provides factory functions for creating BtcDeployLbtc instances.
 * Separates instantiation from the main class.
 *
 * @module chains/btc/actions/deploy-lbtc/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { BtcCoreContext } from '../../../../shared/context';
import { createBtcCoreContext } from '../../../../shared/context';
import { BtcDeployLbtc } from './BtcDeployLbtc';
import type { BtcDeployLbtcParams } from './types';

/**
 * Create BtcDeployLbtc action from config
 *
 * @internal This factory is for internal use. Use createLombardSDK() instead:
 *
 * @example
 * ```typescript
 * const sdk = await createLombardSDK({ env: Env.prod, providers: { ... } });
 * const action = sdk.chain.btc.stakeAndDeploy({
 *   assetOut: AssetId.LBTC,
 *   destChain: Chain.ETHEREUM,
 *   protocol: DeployProtocol.Veda,
 * });
 * await action.prepare({ amount: '0.1', recipient: '0x...' });
 * ```
 */
export function btcStakeAndDeploy(
  config: LombardConfig,
  params: BtcDeployLbtcParams,
): BtcDeployLbtc {
  const ctx = createBtcCoreContext(config);
  return new BtcDeployLbtc(ctx, params);
}

/**
 * Create BtcDeployLbtc action from context
 *
 * Use this when you already have a BtcCoreContext (e.g., in BtcActions).
 *
 * @param ctx - BtcCoreContext
 * @param params - StakeAndDeploy parameters
 * @returns BtcDeployLbtc instance
 */
export function createBtcStakeAndDeploy(
  ctx: BtcCoreContext,
  params: BtcDeployLbtcParams,
): BtcDeployLbtc {
  return new BtcDeployLbtc(ctx, params);
}
