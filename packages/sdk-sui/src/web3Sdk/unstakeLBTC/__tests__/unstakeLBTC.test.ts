import type { SuiGrpcClient } from '@mysten/sui/grpc';
import BigNumber from 'bignumber.js';
import { describe, expect, it, vi } from 'vitest';

import { ERROR_ADDRESS_BALANCE_NEEDS_SIGN_TRANSACTION } from '../../../const';
import { unstakeLBTC } from '../unstakeLBTC';

vi.mock('../../../utils/getSuiCoinDecimals', () => ({
  resolveSuiCoinDecimals: vi.fn().mockResolvedValue(8),
}));

vi.mock('@lombard.finance/sdk-common', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lombard.finance/sdk-common')>()),
  getOutputScript: vi.fn().mockResolvedValue('0x0014aabb'),
}));

const OWNER = `0x${'ab'.repeat(32)}`;

describe('unstakeLBTC', () => {
  it('refuses an address-balance spend on the V1 signing path before signing', async () => {
    const signTransactionBlock = vi.fn();
    const client = {
      core: {
        listCoins: vi.fn().mockResolvedValue({
          objects: [],
          hasNextPage: false,
          cursor: null,
        }),
        getBalance: vi.fn().mockResolvedValue({
          balance: {
            balance: '10000000',
            coinBalance: '0',
            addressBalance: '10000000',
          },
        }),
      },
    } as unknown as SuiGrpcClient;

    await expect(
      unstakeLBTC({
        chainId: 'sui:mainnet',
        wallet: {
          name: 'V1 wallet',
          features: { 'sui:signTransactionBlock': { signTransactionBlock } },
        } as unknown as Parameters<typeof unstakeLBTC>[0]['wallet'],
        walletAccount: { address: OWNER } as unknown as Parameters<
          typeof unstakeLBTC
        >[0]['walletAccount'],
        client,
        btcAddress: 'bc1q',
        amount: new BigNumber('0.1'),
      }),
    ).rejects.toBe(ERROR_ADDRESS_BALANCE_NEEDS_SIGN_TRANSACTION);

    expect(signTransactionBlock).not.toHaveBeenCalled();
  });
});
