/**
 * Golden behavioural baseline for the three Solana actions, captured on 5.x.
 *
 * ## Why this file exists
 *
 * 6.0.0 renames `solana.deposit()` → `solana.deposit()` and merges
 * `solana.withdraw()` + `solana.withdraw()` into `solana.withdraw()`, keeping the
 * old names as delegating aliases. That merge is the best-founded one in the
 * release — `SolanaRedeem` calls only `ctx.solana.redeemForBtc`, which is a
 * strict subset of what `SolanaUnstake` calls — but "well-founded" is not
 * "verified", and the reference behaviour disappears once the merge lands.
 *
 * `SolanaUnstake` is the class that carries the merge risk: it dispatches on
 * `assetOut`, calling `redeem` for BTC.b and `redeemForBtc` for native BTC. Both
 * branches are captured, because the merged class has to keep the same
 * dispatch and the same call for each.
 *
 * Do not update these snapshots to make a refactor pass. A diff means either the
 * refactor changed observable behaviour, or the change is intended and breaking
 * and belongs in the same commit as a CHANGELOG `### Breaking` entry.
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { SolanaRedeem } from '../../../chains/solana/actions/redeem/SolanaRedeem';
import { SolanaStake } from '../../../chains/solana/actions/stake/SolanaStake';
import { SolanaUnstake } from '../../../chains/solana/actions/unstake/SolanaUnstake';
import { AssetId, Chain } from '../../../core';
import { createChainActionHarness } from '../../harness/createChainActionHarness';

const AMOUNT = '0.001';
const SOL_RECIPIENT = '11111111111111111111111111111111';
const BTC_RECIPIENT = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

/** Progress reduced to `status [key=value,…]`. Both keys and terminal values are
 *  the contract: COMPLETED-implies-no-step-left-pending is asserted on these. */
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

describe('golden baseline — Solana actions on 5.x', () => {
  it('SolanaStake (BTC.b → LBTC) records prepare → execute', async () => {
    const h = createChainActionHarness('solana', { env: Env.prod });
    const action = new SolanaStake(h.ctx, {
      assetIn: AssetId.BTCb,
      assetOut: AssetId.LBTC,
      chain: Chain.SOLANA_MAINNET,
    });
    h.observe(action);

    await action.prepare({ amount: AMOUNT, recipient: SOL_RECIPIENT });
    const result = await action.execute();

    expect({
      statuses: h.statuses,
      calls: h.calls.sequence(),
      progress: progressShape(h.progress),
      resultKeys: Object.keys(result).sort(),
    }).toMatchSnapshot();
  });

  it('SolanaUnstake (LBTC → BTC) dispatches to redeemForBtc', async () => {
    const h = createChainActionHarness('solana', { env: Env.prod });
    const action = new SolanaUnstake(h.ctx, {
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
      sourceChain: Chain.SOLANA_MAINNET,
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
    }).toMatchSnapshot();
  });

  it('SolanaUnstake (LBTC → BTC.b) dispatches to redeem — the other branch', async () => {
    const h = createChainActionHarness('solana', { env: Env.prod });
    const action = new SolanaUnstake(h.ctx, {
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTCb,
      sourceChain: Chain.SOLANA_MAINNET,
      destChain: Chain.SOLANA_MAINNET,
    });
    h.observe(action);

    await action.prepare({ amount: AMOUNT, recipient: SOL_RECIPIENT });
    const result = await action.execute();

    expect({
      statuses: h.statuses,
      calls: h.calls.sequence(),
      progress: progressShape(h.progress),
      resultKeys: Object.keys(result).sort(),
    }).toMatchSnapshot();
  });

  it('SolanaRedeem (BTC.b → BTC) records prepare → execute', async () => {
    const h = createChainActionHarness('solana', { env: Env.prod });
    const action = new SolanaRedeem(h.ctx, {
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
      sourceChain: Chain.SOLANA_MAINNET,
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
    }).toMatchSnapshot();
  });
});
