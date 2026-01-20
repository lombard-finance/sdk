/**
 * BTC StakeAndDeploy Factory Functions
 *
 * Provides factory functions for creating BtcStakeAndDeploy instances.
 * Separates instantiation from the main class.
 *
 * @module chains/btc/actions/stakeAndDeploy/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { BtcCoreContext } from '../../../../shared/context';
import { createBtcCoreContext } from '../../../../shared/context';
import { BtcStakeAndDeploy } from './BtcStakeAndDeploy';
import type { BtcStakeAndDeployParams } from './types';

/**
 * Create BtcStakeAndDeploy action from config
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
  params: BtcStakeAndDeployParams,
): BtcStakeAndDeploy {
  const ctx = createBtcCoreContext(config);
  return new BtcStakeAndDeploy(ctx, params);
}

/**
 * Create BtcStakeAndDeploy action from context
 *
 * Use this when you already have a BtcCoreContext (e.g., in BtcActions).
 *
 * @param ctx - BtcCoreContext
 * @param params - StakeAndDeploy parameters
 * @returns BtcStakeAndDeploy instance
 */
export function createBtcStakeAndDeploy(
  ctx: BtcCoreContext,
  params: BtcStakeAndDeployParams,
): BtcStakeAndDeploy {
  return new BtcStakeAndDeploy(ctx, params);
}
