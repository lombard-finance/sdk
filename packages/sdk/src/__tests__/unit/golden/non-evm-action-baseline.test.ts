/**
 * Golden behavioural baseline for the Sui and Starknet actions, captured on 5.x.
 *
 * ## Why this file exists
 *
 * 6.0.0 renames `sui.withdraw()` → `sui.withdraw()` and the same for Starknet,
 * keeping the old names as delegating aliases. The guarantee sold to integrators
 * is that an alias behaves identically to its 5.x original — and that guarantee
 * **cannot be verified after the fact**, because once the rename lands the
 * reference behaviour no longer exists.
 *
 * Neither class had an instantiating test before this file, so the parity claim
 * for two of the five chains rested on nothing.
 *
 * Do not update these snapshots to make a refactor pass. A diff means either the
 * refactor changed observable behaviour, or the change is intended and breaking
 * and belongs in the same commit as a CHANGELOG `### Breaking` entry.
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { StarknetUnstake } from '../../../chains/starknet/actions/unstake/StarknetUnstake';
import { SuiUnstake } from '../../../chains/sui/actions/unstake/SuiUnstake';
import { AssetId, Chain } from '../../../core';
import { createChainActionHarness } from '../../harness/createChainActionHarness';

const AMOUNT = '0.001';
const BTC_RECIPIENT = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

/** Progress reduced to `status [key=value,…]`, so hashes do not make the
 *  snapshot brittle. Both the step keys and their terminal values are the
 *  contract: the `COMPLETED` implies no-step-left-pending property is asserted
 *  against exactly this. */
function progressShape(payloads: unknown[]): string[] {
  return payloads.map((p) => {
    const o = p as { status?: string; steps?: Record<string, string> };
    const steps = o.steps
      ? Object.entries(o.steps)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join(',')
      : '—';
    return `${o.status ?? '?'} [${steps}]`;
  });
}

describe('golden baseline — Sui and Starknet on 5.x', () => {
  describe('SuiUnstake (LBTC → BTC)', () => {
    it('records the full prepare → execute lifecycle', async () => {
      const h = createChainActionHarness('sui', { env: Env.prod });
      const action = new SuiUnstake(h.ctx, {
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTC,
        sourceChain: Chain.SUI_MAINNET,
        destChain: Chain.BITCOIN_MAINNET,
      });
      h.observe(action);

      await action.prepare({ amount: AMOUNT, recipient: BTC_RECIPIENT });
      const result = await action.execute();

      expect({
        statuses: h.statuses,
        calls: h.calls.sequence(),
        progress: progressShape(h.progress),
        resultKeys: Object.keys(result).sort(),
        // The service contract: Sui takes chainId and env, Starknet does not.
        unstakeArgKeys: (h.calls.of('sui', 'unstake')[0]?.[0] as object)
          ? Object.keys(h.calls.of('sui', 'unstake')[0][0] as object).sort()
          : [],
      }).toMatchSnapshot();
    });
  });

  describe('StarknetUnstake (LBTC → BTC)', () => {
    it('records the full prepare → execute lifecycle', async () => {
      const h = createChainActionHarness('starknet', { env: Env.prod });
      const action = new StarknetUnstake(h.ctx, {
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTC,
        sourceChain: Chain.STARKNET_MAINNET,
        destChain: Chain.BITCOIN_MAINNET,
      });
      h.observe(action);

      await action.prepare({ amount: AMOUNT, recipient: BTC_RECIPIENT });
      const result = await action.execute();

      expect({
        statuses: h.statuses,
        calls: h.calls.sequence(),
        progress: progressShape(h.progress),
        resultKeys: Object.keys(result).sort(),
        unstakeArgKeys: (h.calls.of('starknet', 'unstake')[0]?.[0] as object)
          ? Object.keys(h.calls.of('starknet', 'unstake')[0][0] as object).sort()
          : [],
      }).toMatchSnapshot();
    });
  });
});
