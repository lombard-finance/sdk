/**
 * A withdrawal's recipient is never an account the SDK sends from, and never
 * accepted and then ignored.
 *
 * On the LBTC to BTC.b arm the redeem mints BTC.b to the account that burns
 * the LBTC, and `recipient` used to be passed as that account: the burn was
 * simulated and sent from whatever address the caller typed. A wallet holding
 * that address as well would burn its LBTC. On the vault arm the queue pays
 * the requesting account, and `recipient` was accepted and read nowhere.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redeemToken } = vi.hoisted(() => ({ redeemToken: vi.fn() }));
vi.mock('../../../contract-functions', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  redeemToken,
}));
// The first chain read the vault arm makes after the recipient check. Reaching
// it is the assertion that the check passed.
const { PAST_THE_CHECK } = vi.hoisted(() => ({
  PAST_THE_CHECK: new Error('reached the first chain read'),
}));
vi.mock('../../../clients/public-client', () => ({
  makePublicClient: () => ({
    readContract: vi.fn().mockRejectedValue(PAST_THE_CHECK),
    multicall: vi.fn().mockRejectedValue(PAST_THE_CHECK),
  }),
}));

import { EvmWithdrawLbtc } from '../../../chains/evm/actions/withdraw-lbtc/EvmWithdrawLbtc';
import { EvmWithdrawVault } from '../../../chains/evm/actions/withdraw-vault/EvmWithdrawVault';
import { AssetId, Chain, DeployProtocol } from '../../../core';
import { ValidationErrorCode } from '../../../shared/errors';
import { Token } from '../../../tokens/token-addresses';
import { createChainActionHarness } from '../../harness/createChainActionHarness';

const CONNECTED = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SOMEONE_ELSE = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

let connected = CONNECTED;

function harness() {
  return createChainActionHarness('evm', {
    env: Env.prod,
    getProvider: async () => ({
      request: vi.fn(async () => [connected]),
    }),
  });
}

/** Katana: a same-chain LBTC to BTC.b route with no fee ceremony. */
function lbtcToBtcb() {
  return new EvmWithdrawLbtc(harness().ctx, {
    assetIn: AssetId.LBTC,
    assetOut: AssetId.BTCb,
    sourceChain: Chain.KATANA,
    destChain: Chain.KATANA,
  });
}

beforeEach(() => {
  connected = CONNECTED;
  redeemToken.mockReset();
  redeemToken.mockResolvedValue('0xtx');
});

describe('EvmWithdrawLbtc, LBTC to BTC.b', () => {
  it('refuses a recipient other than the connected account at prepare()', async () => {
    const action = lbtcToBtcb();

    await expect(
      action.prepare({ amount: '0.01', recipient: SOMEONE_ELSE }),
    ).rejects.toMatchObject({ code: ValidationErrorCode.INVALID_PARAMETER });
    expect(redeemToken).not.toHaveBeenCalled();
  });

  it('burns from the connected account when it is the recipient', async () => {
    const action = lbtcToBtcb();

    // Checksum case differs from the wallet's; it is the same account.
    await action.prepare({
      amount: '0.01',
      recipient: CONNECTED.toUpperCase().replace('0X', '0x'),
    });
    await action.execute();

    expect(redeemToken).toHaveBeenCalledWith(
      expect.objectContaining({
        account: CONNECTED,
        tokenIn: Token.LBTC,
        tokenOut: Token.BTCb,
        btcAddress: undefined,
      }),
    );
  });

  // The wallet can switch accounts between prepare() and execute().
  it('refuses at execute() when the wallet has switched accounts', async () => {
    const action = lbtcToBtcb();
    await action.prepare({ amount: '0.01', recipient: CONNECTED });

    connected = SOMEONE_ELSE;

    await expect(action.execute()).rejects.toMatchObject({
      code: ValidationErrorCode.INVALID_PARAMETER,
    });
    expect(redeemToken).not.toHaveBeenCalled();
  });
});

describe('EvmWithdrawVault', () => {
  function vaultWithdraw(recipient?: string) {
    return new EvmWithdrawVault(harness().ctx, {
      protocol: DeployProtocol.BitcoinEarn,
      sourceChain: Chain.ETHEREUM,
      ...(recipient ? { recipient } : {}),
    });
  }

  it('refuses a recipient other than the connected account', async () => {
    await expect(
      vaultWithdraw(SOMEONE_ELSE).prepare({ amount: '0.01' }),
    ).rejects.toMatchObject({ code: ValidationErrorCode.INVALID_PARAMETER });
  });

  it.each([
    ['without a recipient', undefined],
    ['with the connected account as recipient', CONNECTED],
  ])('gets past the recipient check %s', async (_label, recipient) => {
    await expect(
      vaultWithdraw(recipient).prepare({ amount: '0.01' }),
    ).rejects.toThrow(PAST_THE_CHECK.message);
  });
});
