import type { SuiGrpcClient } from '@mysten/sui/grpc';
import BigNumber from 'bignumber.js';
import { describe, expect, it, vi } from 'vitest';

import { ERROR_ADDRESS_BALANCE_NEEDS_SIGN_TRANSACTION } from '../../../const';
import { executeSignedTransaction } from '../../../utils/executeSignedTransaction';
import { unstakeLBTC } from '../unstakeLBTC';

vi.mock('../../../utils/getSuiCoinDecimals', () => ({
  resolveSuiCoinDecimals: vi.fn().mockResolvedValue(8),
}));

vi.mock('../../../utils/executeSignedTransaction', () => ({
  executeSignedTransaction: vi.fn().mockResolvedValue({ digest: 'digest' }),
}));

vi.mock('@lombard.finance/sdk-common', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lombard.finance/sdk-common')>()),
  getOutputScript: vi.fn().mockResolvedValue('0x0014aabb'),
}));

type UnstakeParams = Parameters<typeof unstakeLBTC>[0];

const OWNER = `0x${'ab'.repeat(32)}`;
const coinId = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;

/** 0.1 LBTC at 8 decimals. */
const AMOUNT = new BigNumber('0.1');
const AMOUNT_UNITS = '10000000';

function makeClient({
  coins,
  addressBalance,
}: {
  coins: string[];
  addressBalance: string;
}) {
  const coinBalance = coins.reduce((sum, c) => sum + BigInt(c), 0n);
  return {
    core: {
      listCoins: vi.fn().mockResolvedValue({
        objects: coins.map((balance, i) => ({
          objectId: coinId(i + 1),
          balance,
        })),
        hasNextPage: false,
        cursor: null,
      }),
      getBalance: vi.fn().mockResolvedValue({
        balance: {
          balance: String(coinBalance + BigInt(addressBalance)),
          coinBalance: String(coinBalance),
          addressBalance,
        },
      }),
    },
  } as unknown as SuiGrpcClient;
}

function makeWallet(name: string, { v1, v2 }: { v1: boolean; v2: boolean }) {
  const signTransactionBlock = vi.fn().mockResolvedValue({
    transactionBlockBytes: 'bytes',
    signature: 'signature',
  });
  // A V2 wallet reads the transaction through `toJSON()` before signing.
  const signTransaction = vi.fn(
    async ({ transaction }: { transaction: { toJSON(): Promise<string> } }) => {
      await transaction.toJSON();
      return { bytes: 'bytes', signature: 'signature' };
    },
  );
  const wallet = {
    name,
    features: {
      ...(v1 && { 'sui:signTransactionBlock': { signTransactionBlock } }),
      ...(v2 && { 'sui:signTransaction': { signTransaction } }),
    },
  } as unknown as UnstakeParams['wallet'];

  return { wallet, signTransactionBlock, signTransaction };
}

function unstake(wallet: UnstakeParams['wallet'], client: SuiGrpcClient) {
  return unstakeLBTC({
    chainId: 'sui:mainnet',
    wallet,
    walletAccount: {
      address: OWNER,
    } as unknown as UnstakeParams['walletAccount'],
    client,
    btcAddress: 'bc1q',
    amount: AMOUNT,
  });
}

describe('unstakeLBTC', () => {
  it('refuses an address-balance spend on the V1 signing path before signing', async () => {
    const { wallet, signTransactionBlock } = makeWallet('V1 wallet', {
      v1: true,
      v2: false,
    });
    const client = makeClient({ coins: [], addressBalance: AMOUNT_UNITS });

    await expect(unstake(wallet, client)).rejects.toBe(
      ERROR_ADDRESS_BALANCE_NEEDS_SIGN_TRANSACTION,
    );

    expect(signTransactionBlock).not.toHaveBeenCalled();
  });

  it('signs an address-balance spend through V2 for a force-V1 wallet that has it', async () => {
    const { wallet, signTransactionBlock, signTransaction } = makeWallet(
      'OKX Wallet',
      { v1: true, v2: true },
    );
    const client = makeClient({ coins: [], addressBalance: AMOUNT_UNITS });

    await expect(unstake(wallet, client)).resolves.toEqual({
      digest: 'digest',
    });

    expect(signTransaction).toHaveBeenCalledOnce();
    expect(
      await signTransaction.mock.calls[0][0].transaction.toJSON(),
    ).toContain('FundsWithdrawal');
    expect(signTransactionBlock).not.toHaveBeenCalled();
    expect(executeSignedTransaction).toHaveBeenCalledWith(client, {
      bytes: 'bytes',
      signature: 'signature',
    });
  });

  it('keeps a force-V1 wallet on V1 when coin objects cover the amount', async () => {
    const { wallet, signTransactionBlock, signTransaction } = makeWallet(
      'OKX Wallet',
      { v1: true, v2: true },
    );
    const client = makeClient({ coins: [AMOUNT_UNITS], addressBalance: '0' });

    await unstake(wallet, client);

    expect(signTransactionBlock).toHaveBeenCalledOnce();
    expect(signTransaction).not.toHaveBeenCalled();
  });
});
