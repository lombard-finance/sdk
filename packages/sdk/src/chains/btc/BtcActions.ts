/**
 * BTC Actions
 *
 * Provides factory methods for Bitcoin operations (stake, stakeAndDeploy, deposit).
 * This is the user-facing API for BTC operations.
 *
 * @example
 * ```typescript
 * import { createLombardSDK, Chain, AssetId, Env } from '@lombard.finance/sdk';
 *
 * const sdk = await createLombardSDK({
 *   env: Env.prod,
 *   providers: { evm: () => window.ethereum },
 * });
 *
 * const stake = sdk.chain.btc.stake({
 *   assetOut: AssetId.LBTC,
 *   destChain: Chain.ETHEREUM,
 * });
 *
 * await stake.prepare({ amount: '0.1', recipient: '0x...' });
 * await stake.authorize();
 * const address = await stake.generateDepositAddress();
 * ```
 *
 * @module chains/btc/BtcActions
 */

import type { LombardConfig } from '../../config/types';
import type { Chain, DeployProtocol } from '../../core';
import { AssetId } from '../../core';
import type { BtcCoreContext } from '../../shared/context';
import { createBtcCoreContext } from '../../shared/context';
import { LombardError, ValidationErrorCode } from '../../shared/errors';
import { BtcDeployBtcb } from './actions/deploy-btcb/BtcDeployBtcb';
import type {
  BtcDeployBtcb as IBtcDeployBtcb,
  BtcDeployBtcbParams,
} from './actions/deploy-btcb/types';
import { BtcDeployLbtc } from './actions/deploy-lbtc/BtcDeployLbtc';
import type {
  BtcDeployLbtc as IBtcDeployLbtc,
  BtcDeployLbtcParams,
} from './actions/deploy-lbtc/types';
import { BtcDepositBtcb } from './actions/deposit-btcb/BtcDepositBtcb';
import type {
  BtcDepositBtcb as IBtcDepositBtcb,
  BtcDepositBtcbParams,
} from './actions/deposit-btcb/types';
import { BtcDepositLbtc } from './actions/deposit-lbtc/BtcDepositLbtc';
import type {
  BtcDepositLbtc as IBtcDepositLbtc,
  BtcDepositLbtcParams,
} from './actions/deposit-lbtc/types';

/**
 * BTC Actions
 *
 * User-facing class for Bitcoin operations.
 * Created via btcActions(config) factory function.
 */
/**
 * A deploy whose intermediate asset is only known at runtime.
 *
 * The two deploy parameter types differ only in the `assetOut` literal that
 * tells them apart, so this is that shape with the discriminant widened —
 * without it a caller passing a plain `AssetId` matches no overload.
 */
export interface BtcAssetDeployParams {
  assetIn?: AssetId;
  assetOut: AssetId;
  sourceChain?: typeof Chain.BITCOIN_MAINNET | typeof Chain.BITCOIN_SIGNET;
  destChain: Chain;
  protocol: DeployProtocol;
}

/**
 * A BTC deposit whose output asset is only known at runtime.
 *
 * The two routes' parameter types are identical apart from the `assetOut`
 * literal that tells them apart, so this is that shape with the discriminant
 * widened — without it a caller passing a plain `AssetId` matches no overload.
 */
export interface BtcAssetDepositParams {
  assetOut: AssetId;
  destChain: Chain;
  sourceChain?: typeof Chain.BITCOIN_MAINNET | typeof Chain.BITCOIN_SIGNET;
}

export class BtcActions {
  private readonly ctx: BtcCoreContext;

  constructor(config: LombardConfig) {
    this.ctx = createBtcCoreContext(config);
  }

  /**
   * Deposit BTC for custody (BTC → BTC.b)
   *
   * Creates a deposit operation for custodying BTC with BTC.b minting.
   * This is for custody without staking. For staking (BTC → LBTC), use stake().
   *
   * @param params - Deposit parameters
   * @returns BtcDepositBtcb instance
   *
   * @example
   * ```typescript
   * const deposit = btc.deposit({
   *   assetOut: AssetId.BTCb,
   *   destChain: Chain.AVALANCHE,
   * });
   *
   * await deposit.prepare({ amount: '0.1', recipient: '0x...' });
   * await deposit.authorizeFee();
   * const address = await deposit.generateDepositAddress();
   * ```
   */
  deposit(params: BtcDepositLbtcParams): IBtcDepositLbtc;
  deposit(params: BtcDepositBtcbParams): IBtcDepositBtcb;
  /**
   * The arm for a caller whose output asset is only known at runtime — a form,
   * typically. The precise interface cannot be known statically, so the union
   * comes back and the caller narrows.
   */
  deposit(params: BtcAssetDepositParams): IBtcDepositLbtc | IBtcDepositBtcb;
  deposit(params: BtcAssetDepositParams): IBtcDepositLbtc | IBtcDepositBtcb {
    if (params.assetOut === AssetId.LBTC) {
      return new BtcDepositLbtc(this.ctx, params as BtcDepositLbtcParams);
    }

    if (params.assetOut === AssetId.BTCb) {
      return new BtcDepositBtcb(this.ctx, params as BtcDepositBtcbParams);
    }

    // The two routes mint different assets through different contracts, so
    // picking one arbitrarily fails later — inside a flow the caller has already
    // started, and after a signature.
    throw new LombardError(
      ValidationErrorCode.INVALID_ASSET,
      `Cannot deposit BTC as ${String(params.assetOut)}. ` +
        `Supported: ${AssetId.LBTC}, ${AssetId.BTCb}.`,
    );
  }

  /**
   * Deposit Bitcoin straight into a vault.
   *
   * One method for what were two, dispatching on `assetOut` — the intermediate
   * asset the deposit passes through on its way into the vault, and the only
   * thing that distinguished them:
   *
   * - `assetOut: LBTC` routes through LBTC, whose amount is ratio-adjusted
   * - `assetOut: BTC.b` routes through BTC.b, which is 1:1 with BTC
   *
   * There is no `assetOut` naming the vault shares themselves, which is why
   * `deploy` is its own verb rather than a shape of `deposit`: no `AssetId`
   * names them.
   *
   * @throws LombardError if `assetOut` is neither LBTC nor BTC.b
   */
  deploy(params: BtcDeployLbtcParams): IBtcDeployLbtc;
  deploy(params: BtcDeployBtcbParams): IBtcDeployBtcb;
  /**
   * The arm for a caller whose intermediate asset is only known at runtime. The
   * precise interface cannot be known statically, so the union comes back.
   */
  deploy(params: BtcAssetDeployParams): IBtcDeployLbtc | IBtcDeployBtcb;
  deploy(params: BtcAssetDeployParams): IBtcDeployLbtc | IBtcDeployBtcb {
    if (params.assetOut === AssetId.LBTC) {
      return new BtcDeployLbtc(this.ctx, params as BtcDeployLbtcParams);
    }

    if (params.assetOut === AssetId.BTCb) {
      return new BtcDeployBtcb(this.ctx, params as BtcDeployBtcbParams);
    }

    // Picking a class arbitrarily here would fail later, inside a flow the
    // caller has already started, and after a signature.
    throw new LombardError(
      ValidationErrorCode.INVALID_ASSET,
      `Cannot deploy through ${String(params.assetOut)}. ` +
        `Supported: ${AssetId.LBTC}, ${AssetId.BTCb}.`,
    );
  }
}

/**
 * Create BTC actions from config
 *
 * @internal This factory is for internal use. Use createLombardSDK() instead:
 *
 * @example
 * ```typescript
 * const sdk = await createLombardSDK({ env: Env.prod, providers: { ... } });
 * const stake = sdk.chain.btc.stake({ destChain: Chain.ETHEREUM, assetOut: AssetId.LBTC });
 * const deposit = sdk.chain.btc.deposit({ destChain: Chain.AVALANCHE, assetOut: AssetId.BTCb });
 * const stakeAndDeploy = sdk.chain.btc.stakeAndDeploy({
 *   destChain: Chain.AVALANCHE,
 *   assetOut: AssetId.BTCb,
 *   protocol: DeployProtocol.Silo,
 * });
 * ```
 */
export function btcActions(config: LombardConfig): BtcActions {
  return new BtcActions(config);
}
