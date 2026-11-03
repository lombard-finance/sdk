/**
 * The exported `IBtc*` names are what the BTC verbs return.
 *
 * In each BTC action module the class and its interface share a name, and the
 * module barrel exports the interface as `IBtc*`. The chain barrel then
 * re-aliased the bare name instead, which there is the class: `IBtcDepositLbtc`
 * became the class type, and the value `btc.deposit()` returns, typed as the
 * interface, could not be assigned to it. A consumer holding the action in a
 * typed variable got a compile error naming the class's private fields.
 *
 * Type-level only: `tsc --noEmit` checks these, and at runtime they are no-ops.
 */
import { describe, expectTypeOf, it } from 'vitest';

import type { BtcDeployBtcb } from '../../../chains/btc/actions/deploy-btcb/types';
import type { BtcDeployLbtc } from '../../../chains/btc/actions/deploy-lbtc/types';
import type { BtcDepositBtcb } from '../../../chains/btc/actions/deposit-btcb/types';
import type { BtcDepositLbtc } from '../../../chains/btc/actions/deposit-lbtc/types';
import type {
  IBtcDeployBtcb,
  IBtcDeployLbtc,
  IBtcDepositBtcb,
  IBtcDepositLbtc,
} from '../../../index';

describe('IBtc* exports', () => {
  it('are the interfaces the verbs return, not the classes', () => {
    expectTypeOf<IBtcDepositLbtc>().toEqualTypeOf<BtcDepositLbtc>();
    expectTypeOf<IBtcDepositBtcb>().toEqualTypeOf<BtcDepositBtcb>();
    expectTypeOf<IBtcDeployLbtc>().toEqualTypeOf<BtcDeployLbtc>();
    expectTypeOf<IBtcDeployBtcb>().toEqualTypeOf<BtcDeployBtcb>();
  });
});
