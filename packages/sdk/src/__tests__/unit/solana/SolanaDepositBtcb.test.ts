/**
 * SolanaDepositBtcb unit tests
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SolanaDepositBtcb } from '../../../chains/solana/actions/deposit-btcb/SolanaDepositBtcb';
import { PartnerConfiguration } from '../../../client/PartnerConfiguration';
import { AssetId, Chain } from '../../../core';
import { NonEvmOperationStatus } from '../../../shared/constants/statusConstants';
import type { SolanaCoreContext } from '../../../shared/context';

const MOCK_SIGNATURE = 'mock-deposit-signature';

function createMockSolanaService() {
  return {
    signLbtcDestination: vi.fn().mockResolvedValue({ signature: '0xmock' }),
    redeemForBtc: vi
      .fn()
      .mockResolvedValue({ signature: 'mock-redeemForBtc-tx-hash' }),
    redeem: vi.fn().mockResolvedValue({ signature: 'mock-redeem-tx-hash' }),
    deposit: vi.fn().mockResolvedValue({ signature: MOCK_SIGNATURE }),
  };
}

function createMockContext(
  overrides: Partial<SolanaCoreContext> = {},
): SolanaCoreContext {
  return {
    env: Env.dev,
    partner: new PartnerConfiguration({ partnerId: 'test-partner' }),
    getProvider: vi.fn().mockResolvedValue({}),
    solana: createMockSolanaService(),
    ...overrides,
  };
}

describe('SolanaDepositBtcb — BTC.b → LBTC on Solana', () => {
  let mockCtx: SolanaCoreContext;

  const validParams = {
    assetIn: AssetId.BTCb,
    assetOut: AssetId.LBTC,
    chain: Chain.SOLANA_DEVNET,
  };

  const validPrepareParams = {
    amount: '0.001',
    recipient: '11111111111111111111111111111111',
  };

  beforeEach(() => {
    mockCtx = createMockContext({ env: Env.dev });
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should emit CONFIRMING progress with txHash matching the deposit signature', async () => {
      const stake = new SolanaDepositBtcb(mockCtx, validParams);
      await stake.prepare(validPrepareParams);

      const confirmingPayloads: { txHash?: string; status: string }[] = [];
      stake.on('progress', (progress) => {
        if (progress.status === NonEvmOperationStatus.CONFIRMING) {
          confirmingPayloads.push(progress);
        }
      });

      await stake.execute();

      expect(confirmingPayloads).toHaveLength(1);
      expect(confirmingPayloads[0]?.txHash).toBe(MOCK_SIGNATURE);
    });

    it('should emit completed event after execute', async () => {
      const stake = new SolanaDepositBtcb(mockCtx, validParams);
      await stake.prepare(validPrepareParams);

      const completedHandler = vi.fn();
      stake.on('completed', completedHandler);

      await stake.execute();

      expect(completedHandler).toHaveBeenCalledTimes(1);
    });
  });
});
