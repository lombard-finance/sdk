import type { SuiGrpcClient } from '@mysten/sui/grpc';
import BigNumber from 'bignumber.js';
import { describe, expect, it, vi } from 'vitest';

import { ERROR_NOT_ENOUGH_BALANCE } from '../../../const';
import { prepareCoinsTransaction } from '../prepareCoinsTransaction';

vi.mock('../../../utils/getSuiCoinDecimals', () => ({
  resolveSuiCoinDecimals: vi.fn().mockResolvedValue(8),
}));

const LBTC =
  '0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC';
const OWNER = `0x${'ab'.repeat(32)}`;
const coinId = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;

function prepare({
  coins,
  addressBalance,
  amount,
}: {
  coins: string[];
  addressBalance: string;
  amount: string;
}) {
  const coinBalance = coins.reduce((sum, c) => sum + BigInt(c), 0n);
  const client = {
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
          coinType: LBTC,
          balance: String(coinBalance + BigInt(addressBalance)),
          coinBalance: String(coinBalance),
          addressBalance,
        },
      }),
    },
  } as unknown as SuiGrpcClient;

  return prepareCoinsTransaction({
    walletAccount: { address: OWNER } as unknown as Parameters<
      typeof prepareCoinsTransaction
    >[0]['walletAccount'],
    client,
    amount: new BigNumber(amount),
    coinType: LBTC,
  });
}

function withdrawals(
  transaction: Awaited<ReturnType<typeof prepare>>['transaction'],
) {
  return transaction
    .getData()
    .inputs.filter((input) => input.$kind === 'FundsWithdrawal')
    .map((input) => input.FundsWithdrawal);
}

function redeemCalls(
  transaction: Awaited<ReturnType<typeof prepare>>['transaction'],
) {
  return transaction
    .getData()
    .commands.filter(
      (command) =>
        command.$kind === 'MoveCall' &&
        command.MoveCall.function === 'redeem_funds',
    );
}

describe('prepareCoinsTransaction', () => {
  // Protects: LBTC received through `send_funds` has no Coin object, and the
  // withdraw used to fail with "Not enough balance." for such wallets.
  it('spends the address balance when the wallet holds no Coin objects', async () => {
    const { transaction, preparedCoins } = await prepare({
      coins: [],
      addressBalance: '10000000',
      amount: '0.1',
    });

    expect(withdrawals(transaction)).toEqual([
      expect.objectContaining({
        reservation: { $kind: 'MaxAmountU64', MaxAmountU64: '10000000' },
        typeArg: { $kind: 'Balance', Balance: LBTC },
        withdrawFrom: { $kind: 'Sender', Sender: true },
      }),
    ]);
    expect(redeemCalls(transaction)).toHaveLength(1);
    expect(preparedCoins).toEqual({
      $kind: 'NestedResult',
      NestedResult: [0, 0],
    });
    // The withdrawal input and type tag must encode to BCS.
    await expect(
      transaction.build({ onlyTransactionKind: true }),
    ).resolves.toBeInstanceOf(Uint8Array);
  });

  it('redeems only the shortfall and merges the Coin objects into it', async () => {
    const { transaction, preparedCoins } = await prepare({
      coins: ['3000000', '2000000'],
      addressBalance: '10000000',
      amount: '0.08',
    });

    expect(withdrawals(transaction)).toEqual([
      expect.objectContaining({
        reservation: { $kind: 'MaxAmountU64', MaxAmountU64: '3000000' },
      }),
    ]);
    const { commands } = transaction.getData();
    expect(commands.map((command) => command.$kind)).toEqual([
      'MoveCall',
      'MergeCoins',
    ]);
    expect(commands[1].MergeCoins?.destination).toEqual(preparedCoins);
    expect(commands[1].MergeCoins?.sources).toHaveLength(2);
  });

  it('leaves the address balance alone when Coin objects cover the amount', async () => {
    const { transaction } = await prepare({
      coins: ['3000000', '9000000'],
      addressBalance: '10000000',
      amount: '0.05',
    });

    expect(withdrawals(transaction)).toEqual([]);
    expect(redeemCalls(transaction)).toEqual([]);
    expect(
      transaction.getData().commands.map((command) => command.$kind),
    ).toEqual(['SplitCoins', 'MergeCoins']);
  });

  it('throws when Coin objects and the address balance together fall short', async () => {
    await expect(
      prepare({ coins: ['3000000'], addressBalance: '6999999', amount: '0.1' }),
    ).rejects.toBe(ERROR_NOT_ENOUGH_BALANCE);
  });
});
