/**
 * EVM Deploy Factory Functions
 *
 * @module chains/evm/actions/deploy/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { EvmCoreContext } from '../../../../shared/context';
import { createEvmCoreContext } from '../../../../shared/context';
import { EvmDeploy } from './EvmDeploy';
import type { EvmDeployParams } from './types';

/**
 * Create EvmDeploy action from config
 *
 * @internal This factory is for internal use. Use createLombardSDK() instead:
 *
 * @example
 * ```typescript
 * const sdk = await createLombardSDK({ env: Env.prod, providers: { evm: () => window.ethereum } });
 * const deploy = sdk.chain.evm.deploy({
 *   sourceChain: Chain.ETHEREUM,
 *   protocol: DeployProtocol.BitcoinEarn,
 * });
 * await deploy.prepare({ amount: '0.1' });
 * ```
 */
export function evmDeploy(
  config: LombardConfig,
  params: EvmDeployParams,
): EvmDeploy {
  const ctx = createEvmCoreContext(config);
  return new EvmDeploy(ctx, params);
}

/**
 * Create EvmDeploy action from context
 */
export function createEvmDeploy(
  ctx: EvmCoreContext,
  params: EvmDeployParams,
): EvmDeploy {
  return new EvmDeploy(ctx, params);
}
