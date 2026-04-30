/**
 * BTC chain types and actions
 *
 * Import from '@lombard.finance/sdk/btc' for BTC-specific functionality.
 */

// BTC chain actions
export { BtcActions, btcActions } from '../chains/btc/BtcActions';

// BTC types and direct actions
export type {
  BtcDepositAndDeployParams,
  BtcDepositAndDeployPrepareParams,
  BtcDepositAndDeployProgress,
  BtcDepositParams,
  BtcDepositPrepareParams,
  BtcDepositProgress,
  BtcStakeAndDeployParams,
  BtcStakeAndDeployPrepareParams,
  BtcStakeAndDeployProgress,
  BtcStakeParams,
  BtcStakeProgress,
  IBtcDeposit,
  IBtcDepositAndDeploy,
  IBtcStake,
  IBtcStakeAndDeploy } from '../chains/btc';
export {
  BtcDeposit,
  BtcDepositAndDeploy,
  BtcStake,
  BtcStakeAndDeploy } from '../chains/btc';

// BTC status
export { BtcActionStatus } from '../shared/constants/statusConstants';

// BTC module
export { btcModule, type BtcService } from '../modules/btcModule';
