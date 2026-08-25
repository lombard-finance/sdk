/**
 * BTC Chain Exports
 *
 * Provides Bitcoin operations (stake, stakeAndDeploy, deposit).
 *
 * @module chains/btc
 */

// Main exports
export { BtcActions, btcActions } from './BtcActions';

// ═══════════════════════════════════════════════════════════════════════════
// Unified BTC Action Status
// ═══════════════════════════════════════════════════════════════════════════

// Single export to avoid duplicate identifiers
export { BtcActionStatus } from '../../shared/constants/statusConstants';

// ═══════════════════════════════════════════════════════════════════════════
// Stake Action
// ═══════════════════════════════════════════════════════════════════════════

export type {
  BtcDepositLbtcParams,
  BtcDepositLbtcProgress,
  BtcDepositLbtc as IBtcDepositLbtc,
} from './actions/deposit-lbtc';
export { BtcDepositLbtc, btcStake, createBtcStake } from './actions/deposit-lbtc';

// ═══════════════════════════════════════════════════════════════════════════
// Deposit Action
// ═══════════════════════════════════════════════════════════════════════════

export type {
  BtcDepositBtcbParams,
  BtcDepositBtcbPrepareParams,
  BtcDepositBtcbProgress,
  BtcDepositBtcb as IBtcDepositBtcb,
} from './actions/deposit-btcb';
export { btcDeposit, BtcDepositBtcb, createBtcDeposit } from './actions/deposit-btcb';

// ═══════════════════════════════════════════════════════════════════════════
// StakeAndDeploy Action
// ═══════════════════════════════════════════════════════════════════════════

export type {
  BtcDeployLbtcParams,
  BtcDeployLbtcPrepareParams,
  BtcDeployLbtcProgress,
  BtcDeployLbtc as IBtcDeployLbtc,
} from './actions/deploy-lbtc';
export {
  BtcDeployLbtc,
  btcStakeAndDeploy,
  createBtcStakeAndDeploy,
} from './actions/deploy-lbtc';

// ═══════════════════════════════════════════════════════════════════════════
// DepositAndDeploy Action
// ═══════════════════════════════════════════════════════════════════════════

export type {
  BtcDeployBtcbParams,
  BtcDeployBtcbPrepareParams,
  BtcDeployBtcbProgress,
  BtcDeployBtcb as IBtcDeployBtcb,
} from './actions/deploy-btcb';
export {
  BtcDeployBtcb,
  createBtcDepositAndDeploy,
} from './actions/deploy-btcb';
