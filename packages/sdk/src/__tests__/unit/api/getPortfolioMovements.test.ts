/**
 * The v2 portfolio readers: how a `Movement` becomes the `Deposit`, `Unstake`
 * and `PortfolioBridge` consumers already render, and how the lists are paged.
 *
 * The gateway sends enums as short lowercase names and counts rows it could
 * not map in `offset` and `total`, so both are exercised here as they arrive
 * on the wire, not as the published schema describes them.
 */
import type { LombardAuth } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../utils/http', () => ({
  httpRequest: vi.fn(),
}));

import {
  ENotarizationStatus,
  ESessionState,
} from '../../../api-functions/getDepositsByAddress/getDepositsByAddress';
import {
  getPortfolioBridges,
  getPortfolioDeposits,
  getPortfolioWithdrawals,
} from '../../../api-functions/getPortfolioMovements/getPortfolioMovements';
import {
  getMovementChainFamily,
  getMovementChainId,
  getNotarizationStatus,
  getSessionState,
  mapMovementToBridge,
  mapMovementToDeposit,
  mapMovementToUnstake,
  type Movement,
  parseMovementAmount,
} from '../../../api-functions/getPortfolioMovements/movements';
import { PayoutTxStatus } from '../../../api-functions/getUnstakesByAddress/getUnstakesByAddress';
import { ChainId } from '../../../common/chains';
import { Token } from '../../../tokens/token-addresses';
import { httpRequest } from '../../../utils/http';

const ENV = Env.stage;
const ACCOUNT = '0x00000000000000000000000000000000000000AA';
/** Stage LBTC on Sepolia, as the SDK's address table lists it. */
const STAGE_LBTC = '0x731eFa688F3679688cf60A3993b8658138953ED6';

const BTC_LEG = {
  chain: 'bitcoin_signet',
  address: 'tb1qdeposit',
  amount: '150000',
  asset: { decimals: 8 },
  transaction_id: 'btctx',
  transaction_index: 1,
  block_height: '900000',
  block_time: '2026-11-02T12:00:00Z',
};

const EVM_LEG = {
  chain: 'ethereum_sepolia',
  address: ACCOUNT,
  amount: '149000',
  asset: { address: STAGE_LBTC, decimals: 8, asset_type: 'lbtc' },
};

describe('chains', () => {
  it.each([
    ['BLOCKCHAIN_BASE_SEPOLIA', 'base'],
    ['base_sepolia', 'base'],
    ['base', 'base'],
    ['DESTINATION_BLOCKCHAIN_ETHEREUM', 'ethereum'],
    ['avalanche_fuji', 'avalanche'],
    ['sonic_blaze', 'sonic'],
    ['bitcoin_signet', 'bitcoin'],
    ['BLOCKCHAIN_UNKNOWN', undefined],
    [undefined, undefined],
  ])('%s is the %s family', (input, expected) => {
    expect(getMovementChainFamily(input)).toBe(expected);
  });

  it('resolves every naming of one chain to the same id for the env', () => {
    expect(getMovementChainId('BLOCKCHAIN_BASE_SEPOLIA', ENV)).toBe(
      ChainId.baseSepoliaTestnet,
    );
    expect(getMovementChainId('base_sepolia', ENV)).toBe(
      ChainId.baseSepoliaTestnet,
    );
    expect(getMovementChainId('base', ENV)).toBe(ChainId.baseSepoliaTestnet);
    expect(getMovementChainId('base', Env.prod)).toBe(ChainId.base);
  });

  it('names the Bitcoin leg', () => {
    expect(getMovementChainId('bitcoin', ENV)).toBe('bitcoin');
  });

  it('does not mislabel a chain it has no name for as Ethereum', () => {
    expect(getMovementChainId('mantle', ENV)).toBeUndefined();
  });

  it('takes the numeric id from the gateway chain list for those chains', () => {
    const chainIds = new Map([['berachain', '80094']]);
    expect(getMovementChainId('berachain_bartio', ENV, chainIds)).toBe(80094);
  });
});

describe('parseMovementAmount', () => {
  it('reads base units', () => {
    expect(parseMovementAmount({ amount: '150000' }).toString()).toBe('0.0015');
  });

  it('reads a decimal string as already scaled', () => {
    expect(parseMovementAmount({ amount: '0.0015' }).toString()).toBe('0.0015');
  });

  it('treats a missing amount as zero', () => {
    expect(parseMovementAmount({}).isZero()).toBe(true);
  });
});

describe('status', () => {
  it('takes the ledger notarization status when the SDK knows it', () => {
    expect(
      getNotarizationStatus({
        status: 'pending',
        notarization_data: {
          notarization_status: 'NOTARIZATION_STATUS_SUBMITTED',
        },
      }),
    ).toBe(ENotarizationStatus.NOTARIZATION_STATUS_SUBMITTED);
  });

  it('reports a failed movement as failed, whatever the ledger says', () => {
    // SESSION_APPROVED with an expired session: the gateway calls it FAILED.
    const expired: Movement = {
      status: 'MOVEMENT_STATUS_FAILED',
      notarization_data: {
        notarization_status: 'NOTARIZATION_STATUS_SESSION_APPROVED',
      },
    };
    expect(getNotarizationStatus(expired)).toBe(
      ENotarizationStatus.NOTARIZATION_STATUS_FAILED,
    );
    expect(getSessionState(expired)).toBe(ESessionState.SESSION_STATE_EXPIRED);
  });

  it.each([
    [
      'MOVEMENT_STATUS_CLAIMABLE',
      'SESSION_APPROVED',
      'SESSION_STATE_COMPLETED',
    ],
    [
      'MOVEMENT_STATUS_COMPLETED',
      'SESSION_APPROVED',
      'SESSION_STATE_COMPLETED',
    ],
    ['MOVEMENT_STATUS_NOTARIZED', 'SESSION_APPROVED', 'SESSION_STATE_PENDING'],
    ['MOVEMENT_STATUS_RELAYING', 'PENDING', 'SESSION_STATE_PENDING'],
    ['MOVEMENT_STATUS_FAILED', 'FAILED', 'SESSION_STATE_PENDING'],
    [undefined, 'UNSPECIFIED', 'SESSION_STATE_UNSPECIFIED'],
  ])('%s derives %s and %s', (status, notarization, session) => {
    expect(getNotarizationStatus({ status })).toBe(
      `NOTARIZATION_STATUS_${notarization}`,
    );
    expect(getSessionState({ status })).toBe(session);
  });
});

describe('mapMovementToDeposit', () => {
  it('maps a claimable BTC deposit as v1 did', () => {
    const deposit = mapMovementToDeposit(
      {
        type: 'deposit_native',
        status: 'claimable',
        source: BTC_LEG,
        destination: EVM_LEG,
        claim_data: { raw_payload: '0xABCD', proof: 'ef01' },
        notarization_data: { session_id: '42' },
      },
      ENV,
    );

    expect(deposit).toMatchObject({
      isNative: false,
      txHash: 'btctx',
      eventIndex: 1,
      depositAddress: 'tb1qdeposit',
      toAddress: ACCOUNT,
      toChainId: ChainId.sepolia,
      toToken: Token.LBTC,
      blockHeight: 900000,
      blockTime: 1793620800,
      rawPayload: 'ABCD',
      proof: 'ef01',
      sessionId: '42',
      notarizationStatus:
        ENotarizationStatus.NOTARIZATION_STATUS_SESSION_APPROVED,
      sessionState: ESessionState.SESSION_STATE_COMPLETED,
      claimTxHash: undefined,
      isClaimed: false,
      sanctioned: false,
    });
    expect(deposit.amount.toString()).toBe('0.0015');
    expect(deposit.tokenAmount?.toString()).toBe('0.00149');
  });

  it('takes the destination transaction as the claim', () => {
    const deposit = mapMovementToDeposit(
      {
        type: 'deposit_native',
        status: 'completed',
        source: BTC_LEG,
        destination: { ...EVM_LEG, transaction_id: '0xclaim' },
      },
      ENV,
    );

    expect(deposit.claimTxHash).toBe('0xclaim');
    expect(deposit.isClaimed).toBe(true);
  });

  it('marks a completed deposit claimed before its claim tx arrives', () => {
    const deposit = mapMovementToDeposit(
      {
        type: 'deposit_native',
        status: 'completed',
        source: BTC_LEG,
        destination: EVM_LEG,
      },
      ENV,
    );

    expect(deposit.claimTxHash).toBe('true');
    expect(deposit.isClaimed).toBe(true);
  });

  it('leaves the mint amount and block height unset until they are known', () => {
    const deposit = mapMovementToDeposit(
      {
        type: 'deposit_native',
        status: 'pending',
        source: { ...BTC_LEG, block_height: undefined },
        destination: { ...EVM_LEG, amount: '0' },
      },
      ENV,
    );

    expect(deposit.tokenAmount).toBeUndefined();
    expect(deposit.blockHeight).toBeUndefined();
  });

  it('marks a BTC.b deposit native with its sender and source chain', () => {
    const deposit = mapMovementToDeposit(
      {
        type: 'deposit_btcb',
        status: 'sanctioned',
        source: { ...EVM_LEG, chain: 'base_sepolia' },
        destination: EVM_LEG,
      },
      ENV,
    );

    expect(deposit).toMatchObject({
      isNative: true,
      fromAddress: ACCOUNT,
      depositAddress: undefined,
      fromChainId: ChainId.baseSepoliaTestnet,
      sanctioned: true,
    });
  });

  it('falls back to the asset type for a contract the SDK does not list', () => {
    const deposit = mapMovementToDeposit(
      {
        type: 'deposit_native',
        status: 'claimable',
        source: BTC_LEG,
        destination: {
          ...EVM_LEG,
          asset: {
            address: '0x600e4006278eb11fa1691ca0fe6c5fcfc4992d58',
            asset_type: 'btcb',
          },
        },
      },
      ENV,
    );

    expect(deposit.toToken).toBe(Token.BTCb);
  });
});

describe('mapMovementToUnstake', () => {
  it('maps a pending redeem to Bitcoin', () => {
    const unstake = mapMovementToUnstake(
      {
        type: 'redeem_native',
        status: 'pending',
        source: { ...EVM_LEG, transaction_id: '0xburn' },
        destination: { ...BTC_LEG, transaction_id: undefined },
      },
      ENV,
    );

    expect(unstake).toMatchObject({
      isNative: false,
      txHash: '0xburn',
      fromChainId: ChainId.sepolia,
      toChainId: undefined,
      toAddress: 'tb1qdeposit',
      payoutTxHash: undefined,
      payoutTxStatus: PayoutTxStatus.Pending,
    });
  });

  it('completes a redeem once the Bitcoin payout exists', () => {
    const unstake = mapMovementToUnstake(
      {
        type: 'redeem_native',
        status: 'confirmed',
        source: EVM_LEG,
        destination: BTC_LEG,
      },
      ENV,
    );

    expect(unstake.payoutTxHash).toBe('btctx');
    expect(unstake.payoutTxIndex).toBe(1);
    expect(unstake.payoutTxStatus).toBe(PayoutTxStatus.Completed);
  });

  it('maps LBTC to BTC.b as a native redeem with its claim', () => {
    const unstake = mapMovementToUnstake(
      {
        type: 'redeem_lbtc',
        status: 'completed',
        source: EVM_LEG,
        destination: { ...EVM_LEG, transaction_id: '0xmint' },
      },
      ENV,
    );

    expect(unstake).toMatchObject({
      isNative: true,
      toChainId: ChainId.sepolia,
      toToken: Token.BTCb,
      claimTxHash: '0xmint',
      payoutTxHash: undefined,
      payoutTxStatus: PayoutTxStatus.Completed,
      sessionState: ESessionState.SESSION_STATE_COMPLETED,
    });
  });

  it('maps BTC.b paid out in BTC as a v1 redeem to Bitcoin', () => {
    const unstake = mapMovementToUnstake(
      {
        type: 'redeem_native',
        status: 'completed',
        source: { ...EVM_LEG, asset: { asset_type: 'btcb', decimals: 8 } },
        destination: BTC_LEG,
      },
      ENV,
    );

    expect(unstake).toMatchObject({
      isNative: true,
      toChainId: 'bitcoin',
      payoutTxHash: 'btctx',
      payoutTxIndex: 1,
      claimTxHash: undefined,
      payoutTxStatus: PayoutTxStatus.Completed,
    });
  });

  it('classifies a redeem by type when its destination chain is unknown', () => {
    const unstake = mapMovementToUnstake(
      {
        type: 'redeem_lbtc',
        status: 'pending',
        source: EVM_LEG,
        destination: { ...EVM_LEG, chain: undefined, transaction_id: '0xmint' },
      },
      ENV,
    );

    expect(unstake.isNative).toBe(true);
    expect(unstake.payoutTxHash).toBeUndefined();
    expect(unstake.payoutTxStatus).toBe(PayoutTxStatus.Pending);
  });
});

describe('mapMovementToBridge', () => {
  it('maps both legs', () => {
    const bridge = mapMovementToBridge(
      {
        type: 'bridge',
        status: 'completed',
        source: {
          ...EVM_LEG,
          transaction_id: '0xsend',
          block_time: BTC_LEG.block_time,
        },
        destination: {
          ...EVM_LEG,
          chain: 'base_sepolia',
          transaction_id: '0xreceive',
        },
      },
      ENV,
    );

    expect(bridge).toMatchObject({
      txHash: '0xsend',
      blockTime: 1793620800,
      fromAddress: ACCOUNT,
      fromChainId: ChainId.sepolia,
      toChainId: ChainId.baseSepoliaTestnet,
      tokenAddress: STAGE_LBTC,
      destinationTxHash: '0xreceive',
      status: 'MOVEMENT_STATUS_COMPLETED',
    });
  });
});

describe('the readers', () => {
  const auth: LombardAuth = { getToken: async () => 'jwt' };
  const mockedHttp = vi.mocked(httpRequest);
  const range = (from: number, to: number) =>
    Array.from({ length: to - from }, (_, i) => from + i);
  const depositRow = (n: number): Movement => ({
    id: `tx${n}:0`,
    type: 'deposit_native',
    status: 'pending',
    source: { transaction_id: `tx${n}`, amount: '1000' },
  });

  /** Answers each offset with its rows; `total` counts skipped rows too. */
  function mockGateway(
    pages: Record<number, number[]>,
    total?: number,
    list = 'deposits',
  ) {
    mockedHttp.mockImplementation((async ({
      url,
      params,
    }: {
      url: string;
      params?: { offset?: number };
    }) => {
      if (url.endsWith('/v2/chains')) return { data: { chains: [] } };
      const rows = pages[params?.offset ?? 0] ?? [];
      return {
        data: {
          [list]: rows.map(depositRow),
          page_info: total === undefined ? undefined : { total },
        },
      };
    }) as never);
  }

  const requestedOffsets = () =>
    mockedHttp.mock.calls
      .map(
        ([options]) => options as { url: string; params?: { offset: number } },
      )
      .filter((options) => !options.url.endsWith('/v2/chains'))
      .map((options) => options.params?.offset);

  afterEach(() => {
    mockedHttp.mockReset();
  });

  it('sends a user-scoped request with the auth it was given', async () => {
    mockGateway({ 0: [] }, 0);

    await getPortfolioDeposits({ address: ACCOUNT, env: ENV, auth });

    const listCall = mockedHttp.mock.calls
      .map(([options]) => options)
      .find((options) => options.url.endsWith('/deposits'));
    expect(listCall).toMatchObject({
      url: `https://staging.prod.lombard.finance/v2/portfolio/${ACCOUNT}/deposits`,
      scope: 'userScoped',
      auth,
      params: { limit: 100, offset: 0, order: 'desc' },
    });
  });

  it('reads past a page shortened by a skipped row', async () => {
    // Row 57 could not be mapped, so the first page holds 99 of 100.
    mockGateway(
      { 0: range(0, 100).filter((n) => n !== 57), 100: range(100, 150) },
      150,
    );

    const deposits = await getPortfolioDeposits({
      address: ACCOUNT,
      env: ENV,
      auth,
    });

    expect(requestedOffsets()).toEqual([0, 100]);
    expect(deposits).toHaveLength(149);
  });

  it('reads past a page whose rows were all skipped', async () => {
    mockGateway({ 0: range(0, 100), 100: [], 200: range(200, 250) }, 250);

    const deposits = await getPortfolioDeposits({
      address: ACCOUNT,
      env: ENV,
      auth,
    });

    expect(requestedOffsets()).toEqual([0, 100, 200]);
    expect(deposits).toHaveLength(150);
  });

  it('ends on a short page when the response has no total', async () => {
    mockGateway({ 0: range(0, 100), 100: range(100, 140) });

    const deposits = await getPortfolioDeposits({
      address: ACCOUNT,
      env: ENV,
      auth,
    });

    expect(requestedOffsets()).toEqual([0, 100]);
    expect(deposits).toHaveLength(140);
  });

  it('keeps one copy of a row repeated across pages', async () => {
    // A new deposit between the two reads pushes row 99 onto the next page.
    mockGateway({ 0: range(0, 100), 100: range(99, 199) }, 200);

    const deposits = await getPortfolioDeposits({
      address: ACCOUNT,
      env: ENV,
      auth,
    });

    expect(deposits).toHaveLength(199);
    expect(new Set(deposits.map((d) => d.txHash)).size).toBe(199);
  });

  it('stops after twenty pages whatever total says', async () => {
    const pages = Object.fromEntries(
      range(0, 30).map((page) => [
        page * 100,
        range(page * 100, page * 100 + 100),
      ]),
    );
    mockGateway(pages, 1_000_000);

    const deposits = await getPortfolioDeposits({
      address: ACCOUNT,
      env: ENV,
      auth,
    });

    expect(requestedOffsets()).toHaveLength(20);
    expect(deposits).toHaveLength(2000);
  });

  it('filters withdrawals the way the v1 route does', async () => {
    const BTCB_LEG = {
      ...EVM_LEG,
      asset: { ...EVM_LEG.asset, address: undefined, asset_type: 'btcb' },
    };
    mockedHttp.mockImplementation((async ({ url }: { url: string }) => {
      if (url.endsWith('/v2/chains')) return { data: { chains: [] } };
      return {
        data: {
          withdrawals: [
            // LBTC paid out in BTC: a v1 unstake.
            {
              id: 'a',
              type: 'redeem_native',
              status: 'pending',
              source: EVM_LEG,
              destination: BTC_LEG,
            },
            // LBTC to BTC.b on chain: a v1 redeem to the native chain.
            {
              id: 'b',
              type: 'redeem_lbtc',
              status: 'pending',
              source: EVM_LEG,
              destination: EVM_LEG,
            },
            // BTC.b paid out in BTC: a v1 redeem to Bitcoin.
            {
              id: 'c',
              type: 'redeem_native',
              status: 'pending',
              source: BTCB_LEG,
              destination: BTC_LEG,
            },
          ],
          page_info: { total: 3 },
        },
      };
    }) as never);
    const kinds = async (options?: Record<string, boolean>) =>
      (
        await getPortfolioWithdrawals({
          address: ACCOUNT,
          env: ENV,
          auth,
          options,
        })
      ).map(
        (u) => `${u.isNative ? 'redeem' : 'unstake'}:${u.toChainId ?? '-'}`,
      );

    expect(await kinds()).toEqual([
      'unstake:-',
      `redeem:${ChainId.sepolia}`,
      'redeem:bitcoin',
    ]);
    expect(await kinds({ show_unstakes: true })).toEqual(['unstake:-']);
    expect(await kinds({ show_redeems: true })).toEqual([
      `redeem:${ChainId.sepolia}`,
      'redeem:bitcoin',
    ]);
    // `false` is never sent to v1, which reads it as no flag: both kinds.
    expect(await kinds({ show_redeems: false })).toHaveLength(3);
    // `to_native` narrows the redeems and leaves the unstakes alone.
    expect(await kinds({ to_native: true })).toEqual([
      'unstake:-',
      `redeem:${ChainId.sepolia}`,
    ]);
  });

  it('resolves bridge lanes the SDK has no name for from the gateway chain list', async () => {
    mockedHttp.mockImplementation((async ({ url }: { url: string }) => {
      if (url.endsWith('/v2/chains')) {
        return { data: { chains: [{ name: 'berachain', chain_id: '80069' }] } };
      }
      return {
        data: {
          bridges: [
            {
              id: 'x',
              type: 'bridge',
              status: 'completed',
              source: {
                ...EVM_LEG,
                chain: 'berachain_bartio',
                transaction_id: '0xsend',
              },
              destination: EVM_LEG,
            },
          ],
          page_info: { total: 1 },
        },
      };
    }) as never);

    // The prod host, so its chain list is read here rather than cached by an
    // earlier test against stage.
    const [bridge] = await getPortfolioBridges({
      address: ACCOUNT,
      env: Env.prod,
      auth,
    });

    expect(bridge.fromChainId).toBe(80069);
    expect(bridge.toChainId).toBe(ChainId.ethereum);
  });

  /**
   * One record the mappers cannot read is left out, not the list. The
   * mappers tolerate missing fields but throw on mistyped ones, and a throw
   * inside one row used to reject the whole read, so every screen built from
   * it showed nothing.
   */
  describe('a record that cannot be read', () => {
    const good = (id: string): Movement => ({
      id,
      type: 'deposit_native',
      status: 'pending',
      source: BTC_LEG,
      destination: EVM_LEG,
    });

    function answers(list: string, rows: unknown) {
      mockedHttp.mockImplementation((async ({ url }: { url: string }) => {
        if (url.endsWith('/v2/chains')) return { data: { chains: [] } };
        return { data: { [list]: rows, page_info: { total: 3 } } };
      }) as never);
    }

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    afterEach(() => warn.mockClear());

    it.each([
      ['a status sent as a number', { status: 7 }],
      ['a type sent as a number', { type: 2 }],
      [
        'an amount sent as a JSON number',
        { source: { ...BTC_LEG, amount: 1 } },
      ],
      ['a chain sent as a number', { destination: { ...EVM_LEG, chain: 1 } }],
      ['a proof sent as a number', { claim_data: { proof: 123 } }],
    ])('is left out of the deposits when it has %s', async (_label, bad) => {
      answers('deposits', [good('a'), { ...good('bad'), ...bad }, good('b')]);

      const deposits = await getPortfolioDeposits({
        address: ACCOUNT,
        env: ENV,
        auth,
      });

      expect(deposits).toHaveLength(2);
      // Named by id, never by contents.
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('(bad)'));
    });

    it('is left out of the withdrawals and the bridges too', async () => {
      answers('withdrawals', [
        { ...good('w1'), type: 'redeem_native' },
        { ...good('w2'), type: 'redeem_native', status: 7 },
      ]);
      await expect(
        getPortfolioWithdrawals({ address: ACCOUNT, env: ENV, auth }),
      ).resolves.toHaveLength(1);

      answers('bridges', [good('b1'), { ...good('b2'), status: 7 }]);
      await expect(
        getPortfolioBridges({ address: ACCOUNT, env: ENV, auth }),
      ).resolves.toHaveLength(1);
    });

    it.each([
      ['null', null],
      ['a string', 'row'],
      ['a number', 7],
    ])('skips a row that is %s', async (_label, row) => {
      answers('deposits', [good('a'), row, good('b')]);

      await expect(
        getPortfolioDeposits({ address: ACCOUNT, env: ENV, auth }),
      ).resolves.toHaveLength(2);
    });

    // Not an empty list: the response could not be read, and an empty list
    // would say the account has no deposits.
    it('rejects a list that is not an array, with a reason', async () => {
      answers('deposits', { not: 'an array' });

      await expect(
        getPortfolioDeposits({ address: ACCOUNT, env: ENV, auth }),
      ).rejects.toThrow(/deposits list .* is not an array/);
    });
  });
});
