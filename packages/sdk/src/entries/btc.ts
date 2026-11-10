/**
 * BTC chain types and actions
 *
 * Import from '@lombard.finance/sdk/btc' for BTC-specific functionality.
 */

// BTC chain actions
export { BtcActions, btcActions } from '../chains/btc/BtcActions';

// BTC types and direct actions
export type {
  BtcDeployBtcbParams,
  BtcDeployBtcbPrepareParams,
  BtcDeployBtcbProgress,
  BtcDeployLbtcParams,
  BtcDeployLbtcPrepareParams,
  BtcDeployLbtcProgress,
  BtcDepositBtcbParams,
  BtcDepositBtcbPrepareParams,
  BtcDepositBtcbProgress,
  BtcDepositLbtcParams,
  BtcDepositLbtcProgress,
  IBtcDeployBtcb,
  IBtcDeployLbtc,
  IBtcDepositBtcb,
  IBtcDepositLbtc,
} from '../chains/btc';
export {
  BtcDeployBtcb,
  BtcDeployLbtc,
  BtcDepositBtcb,
  BtcDepositLbtc,
} from '../chains/btc';

// BTC status
export { BtcActionStatus } from '../shared/constants/statusConstants';

// BTC module
export { btcModule, type BtcService } from '../modules/btcModule';
