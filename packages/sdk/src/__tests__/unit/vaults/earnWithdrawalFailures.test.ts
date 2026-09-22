/**
 * Vault withdrawals report why they could not answer.
 *
 * The aggregate used to catch each chain's error, log it to the console and
 * return empty arrays, so the combined promise resolved successfully with
 * nothing in it. A caller could not tell "this account has no withdrawals"
 * from "every chain refused the request", and the playground rendered an
 * authorization failure as "No open withdrawals found".
 *
 * @module __tests__/unit/vaults/earnWithdrawalFailures.test
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../../../common/chains';
import {
  EARN_VAULT_WITHDRAW_QUEUE_CONTRACTS,
  isEarnAvailable,
} from '../../../vaults/lib/config';
import { getEarnWithdrawalsAllChains } from '../../../vaults/lib/ops/get-vault-withdrawals';

describe('Earn availability', () => {
  it('is configured for production only', () => {
    expect(isEarnAvailable(Env.prod)).toBe(true);
    for (const env of [Env.stage, Env.testnet, Env.dev]) {
      expect(isEarnAvailable(env)).toBe(false);
    }
  });

  it('reports unavailability instead of addressing mainnet from a testnet', async () => {
    // No network call should be attempted: the point is that the SDK says so
    // rather than asking a stage backend about a mainnet contract.
    const result = await getEarnWithdrawalsAllChains({
      account: '0x0F90793a54E809bf708bd0FbCC63d311E3bb1BE1',
      env: Env.stage,
    });

    expect(result.open).toEqual([]);
    expect(result.failures.length).toBeGreaterThan(0);
    // The message names the environment, so a UI can repeat it verbatim.
    expect(result.failures[0].message).toContain('stage');
    expect(result.failures[0].message).toContain('unavailable');
  });

  it('distinguishes an empty read from a failed one through `failures`', async () => {
    const result = await getEarnWithdrawalsAllChains({
      account: '0x0F90793a54E809bf708bd0FbCC63d311E3bb1BE1',
      env: Env.stage,
    });

    // Both are empty; only `failures` separates them, which is the whole point.
    expect(result.open).toEqual([]);
    expect(result.failures).not.toEqual([]);
  });
});

describe('Earn withdraw queue contracts', () => {
  it('declares its own chain on every entry', () => {
    // The map key and the chainId field disagreed on Base and BSC, and the
    // contract sharing one address across all three chains hid it.
    for (const [key, contract] of Object.entries(
      EARN_VAULT_WITHDRAW_QUEUE_CONTRACTS,
    )) {
      expect(contract.chainId).toBe(Number(key));
    }
  });

  it('covers Base and BSC specifically', () => {
    expect(EARN_VAULT_WITHDRAW_QUEUE_CONTRACTS[ChainId.base].chainId).toBe(
      ChainId.base,
    );
    expect(
      EARN_VAULT_WITHDRAW_QUEUE_CONTRACTS[ChainId.binanceSmartChain].chainId,
    ).toBe(ChainId.binanceSmartChain);
  });
});
