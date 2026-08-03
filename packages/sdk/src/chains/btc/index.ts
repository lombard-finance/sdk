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

// Shared by both deploy actions' authorizeDeposit(), exported once here for
// the same reason as BtcActionStatus above
export type { AuthorizeDepositOptions } from './actions/shared';

// ═══════════════════════════════════════════════════════════════════════════
// Stake Action
// ═══════════════════════════════════════════════════════════════════════════

export type {
  BtcStakeParams,
  BtcStakeProgress,
  BtcStake as IBtcStake,
} from './actions/stake';
export { BtcStake, btcStake, createBtcStake } from './actions/stake';

// ═══════════════════════════════════════════════════════════════════════════
// Deposit Action
// ═══════════════════════════════════════════════════════════════════════════

export type {
  BtcDepositParams,
  BtcDepositPrepareParams,
  BtcDepositProgress,
  BtcDeposit as IBtcDeposit,
} from './actions/deposit';
export { BtcDeposit, btcDeposit, createBtcDeposit } from './actions/deposit';

// ═══════════════════════════════════════════════════════════════════════════
// StakeAndDeploy Action
// ═══════════════════════════════════════════════════════════════════════════

export type {
  BtcStakeAndDeployParams,
  BtcStakeAndDeployPrepareParams,
  BtcStakeAndDeployProgress,
  BtcStakeAndDeploy as IBtcStakeAndDeploy,
} from './actions/stakeAndDeploy';
export {
  BtcStakeAndDeploy,
  btcStakeAndDeploy,
  createBtcStakeAndDeploy,
} from './actions/stakeAndDeploy';

// ═══════════════════════════════════════════════════════════════════════════
// DepositAndDeploy Action
// ═══════════════════════════════════════════════════════════════════════════

export type {
  BtcDepositAndDeployParams,
  BtcDepositAndDeployPrepareParams,
  BtcDepositAndDeployProgress,
  BtcDepositAndDeploy as IBtcDepositAndDeploy,
} from './actions/depositAndDeploy';
export {
  BtcDepositAndDeploy,
  createBtcDepositAndDeploy,
} from './actions/depositAndDeploy';
