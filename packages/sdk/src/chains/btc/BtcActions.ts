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
import { BtcDeposit } from './actions/deposit/BtcDeposit';
import type {
  BtcDeposit as IBtcDeposit,
  BtcDepositParams,
} from './actions/deposit/types';
import { BtcDepositAndDeploy } from './actions/depositAndDeploy/BtcDepositAndDeploy';
import type {
  BtcDepositAndDeploy as IBtcDepositAndDeploy,
  BtcDepositAndDeployParams,
} from './actions/depositAndDeploy/types';
import { BtcStake } from './actions/stake/BtcStake';
import type {
  BtcStake as IBtcStake,
  BtcStakeParams,
} from './actions/stake/types';
import { BtcStakeAndDeploy } from './actions/stakeAndDeploy/BtcStakeAndDeploy';
import type {
  BtcStakeAndDeploy as IBtcStakeAndDeploy,
  BtcStakeAndDeployParams,
} from './actions/stakeAndDeploy/types';

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

export class BtcActions {
  private readonly ctx: BtcCoreContext;

  constructor(config: LombardConfig) {
    this.ctx = createBtcCoreContext(config);
  }

  /**
   * Stake BTC → LBTC
   *
   * Creates a stake operation for converting BTC to LBTC on a destination chain.
   * Supports all destination chains: EVM, Solana, Sui, and Starknet.
   *
   * @param params - Stake parameters
   * @returns BtcStake instance
   *
   * @example
   * ```typescript
   * const stake = btc.stake({
   *   assetOut: AssetId.LBTC,
   *   destChain: Chain.ETHEREUM,
   * });
   *
   * await stake.prepare({ amount: '0.1', recipient: '0x...' });
   * await stake.authorize();
   * const address = await stake.generateDepositAddress();
   * ```
   */
  stake(params: BtcStakeParams): IBtcStake {
    return new BtcStake(this.ctx, params);
  }

  /**
   * Stake and Deploy BTC → LBTC + auto-deploy ("Stake and Bake")
   *
   * Creates an atomic operation that:
   * 1. Converts BTC to LBTC
   * 2. Automatically deposits LBTC to the specified DeFi vault
   *
   * @param params - StakeAndDeploy parameters including protocol/vault
   * @returns BtcStakeAndDeploy instance
   *
   * @example
   * ```typescript
   * const action = btc.stakeAndDeploy({
   *   assetOut: AssetId.LBTC,
   *   destChain: Chain.ETHEREUM,
   *   protocol: DeployProtocol.Veda,
   * });
   *
   * await action.prepare({ amount: '0.1', recipient: '0x...' });
   * await action.authorizeDeposit();
   * const address = await action.generateDepositAddress();
   * ```
   */
  /**
   * @deprecated Use {@link deploy} instead, which dispatches on `assetOut`.
   * Removed in the next major.
   */
  stakeAndDeploy(params: BtcStakeAndDeployParams): IBtcStakeAndDeploy {
    return new BtcStakeAndDeploy(this.ctx, params);
  }

  /**
   * Deposit BTC for custody (BTC → BTC.b)
   *
   * Creates a deposit operation for custodying BTC with BTC.b minting.
   * This is for custody without staking. For staking (BTC → LBTC), use stake().
   *
   * @param params - Deposit parameters
   * @returns BtcDeposit instance
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
  deposit(params: BtcDepositParams): IBtcDeposit {
    return new BtcDeposit(this.ctx, params);
  }

  /**
   * Deposit and Deploy BTC → BTC.b + auto-deploy to vault
   *
   * Creates an atomic operation that:
   * 1. Converts BTC to BTC.b (wrapped BTC)
   * 2. Automatically deposits BTC.b to the specified DeFi vault (e.g., Silo on Avalanche)
   *
   * This is similar to stakeAndDeploy but for protocols that accept BTC.b instead of LBTC.
   *
   * @param params - DepositAndDeploy parameters including protocol/vault
   * @returns BtcDepositAndDeploy instance
   *
   * @example
   * ```typescript
   * const action = btc.depositAndDeploy({
   *   assetOut: AssetId.BTCb,
   *   destChain: Chain.AVALANCHE,
   *   protocol: DeployProtocol.Silo,
   * });
   *
   * await action.prepare({ amount: '0.1', recipient: '0x...' });
   * await action.authorizeDeposit();
   * const address = await action.generateDepositAddress();
   * ```
   */
  /**
   * @deprecated Use {@link deploy} instead, which dispatches on `assetOut`.
   * Removed in the next major.
   */
  depositAndDeploy(params: BtcDepositAndDeployParams): IBtcDepositAndDeploy {
    return new BtcDepositAndDeploy(this.ctx, params);
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
  deploy(params: BtcStakeAndDeployParams): IBtcStakeAndDeploy;
  deploy(params: BtcDepositAndDeployParams): IBtcDepositAndDeploy;
  /**
   * The arm for a caller whose intermediate asset is only known at runtime. The
   * precise interface cannot be known statically, so the union comes back.
   */
  deploy(
    params: BtcAssetDeployParams,
  ): IBtcStakeAndDeploy | IBtcDepositAndDeploy;
  deploy(
    params: BtcAssetDeployParams,
  ): IBtcStakeAndDeploy | IBtcDepositAndDeploy {
    if (params.assetOut === AssetId.LBTC) {
      return new BtcStakeAndDeploy(this.ctx, params as BtcStakeAndDeployParams);
    }

    if (params.assetOut === AssetId.BTCb) {
      return new BtcDepositAndDeploy(
        this.ctx,
        params as BtcDepositAndDeployParams,
      );
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
