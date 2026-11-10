/**
 * BTC DepositAndDeploy Factory Functions
 *
 * Factory functions for creating BTC DepositAndDeploy actions.
 *
 * @module chains/btc/actions/deploy-btcb/factory
 */

import type { BtcCoreContext } from '../../../../shared/context';
import { BtcDeployBtcb } from './BtcDeployBtcb';
import type { BtcDeployBtcbParams } from './types';

/**
 * Create a BTC DepositAndDeploy action
 *
 * Convenience factory function for creating BTC → BTC.b → Vault operations.
 *
 * @example
 * ```typescript
 * import { createBtcDepositAndDeploy, Chain, AssetId, DeployProtocol } from '@lombard.finance/sdk';
 *
 * const depositAndDeploy = createBtcDepositAndDeploy(ctx, {
 *   assetOut: AssetId.BTCb,
 *   destChain: Chain.AVALANCHE,
 *   protocol: DeployProtocol.Silo,
 * });
 *
 * await depositAndDeploy.prepare({ amount: '0.1', recipient: '0x...' });
 * await depositAndDeploy.authorizeDeposit();
 * const address = await depositAndDeploy.generateDepositAddress();
 * ```
 */
export function createBtcDepositAndDeploy(
  ctx: BtcCoreContext,
  params: BtcDeployBtcbParams,
): BtcDeployBtcb {
  return new BtcDeployBtcb(ctx, params);
}
