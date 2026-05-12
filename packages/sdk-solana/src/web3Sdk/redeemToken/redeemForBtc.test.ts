import { PublicKey } from '@solana/web3.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IConfig } from '../../const/getConfig';
import { SolanaNetwork } from '../../types';
import { ErrorCode, SolanaSdkError } from '../../utils';

// ── Mocks ──

const mockRedeemBtcbForBtc = vi.fn().mockResolvedValue('btcb-sig');
const mockRedeemLbtcForBtc = vi.fn().mockResolvedValue('lbtc-sig');

vi.mock('./redeemBtcb', () => ({
  redeemBtcbForBtc: (...a: unknown[]) => mockRedeemBtcbForBtc(...a),
}));
vi.mock('./redeemLbtc', () => ({
  redeemLbtcForBtc: (...a: unknown[]) => mockRedeemLbtcForBtc(...a),
}));

const MOCK_LBTC_MINT = 'LBTCojyVJ63rsEED2DLEGWMzSxWJyQynXE91LMLgV1J';
const MOCK_BTCB_MINT = 'BTCB3ripBAut19jM8kDPVbJHb2ZdR2GcZvGZkCmFPtV8';
const MOCK_ASSET_ROUTER = 'LomVyJDZ91jeVbNnTupJXKJTQFakJVMc87CmwDHYt95';
const MOCK_MAILBOX = 'LomJw912MoUd7iiAesTQAgz1paLcTqi6ndG3w3pnKH9';
const MOCK_SOLANA_CHAIN_ID =
  '0259db5080fc2c6d3bcf7ca90712d3c2e5e6c28f27f0dfbb9953bdb0894c03ab';
const MOCK_BITCOIN_CHAIN_ID =
  'ff000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6';
const MOCK_LEDGER_CHAIN_ID =
  '031f51c4e4cc1dae1c752d2f8fe2ae045da668a13f2e47a465964d630f5ed22e';
const MOCK_PAYER = '8yarEiDaJVikHZbk3PQSoWiDn2T3oM1FHZN1Jv4VZFdr';

const fullConfig: IConfig = {
  lbtcTokenMint: MOCK_LBTC_MINT,
  btcbTokenMint: MOCK_BTCB_MINT,
  assetRouter: MOCK_ASSET_ROUTER,
  mailbox: MOCK_MAILBOX,
  solanaRoutingChainId: MOCK_SOLANA_CHAIN_ID,
  bitcoinRoutingChainId: MOCK_BITCOIN_CHAIN_ID,
  ledgerChainId: MOCK_LEDGER_CHAIN_ID,
  lbtcProgramId: 'HEY7PCJe3GB27UWdopuYb1xDbB5SNtTcYPxRjntvfBSA',
  treasuryAddress: 'ByHNGi4zPJw5StyWZoLQJ9n2wT12oupJF2pTSNKMnnAZ',
  bascule: null,
  basculeData: null,
  admin: '6MKjyWZnkSMitJYAixvJzqhJiVsjTA3hYHX8aP9qNioj',
  lzOftAdapter: 'AEFwQgaSNhQcZhAcGZGM9iTyGML3fsJC2aBvYmzV81FE',
  lzOftStore: '3SG3oyrG3KSvJ9bbxPDu7ZXEe5o1TW1QkgudkKvK6FK4',
  lzMultisig: 'GfYV1f1bR9vy41mSyQ8quxYbds121kijSBj5A3nG8oDQ',
  lzEscrow: 'GRq2yasTvWWPPqSwxCZvqfCTfDhP3MswDH4nW2v6F5To',
  consortium: null,
  ratioOracle: null,
  bridge: null,
  lombardTokenPool: null,
};

vi.mock('../../const/getConfig', () => ({
  DEFAULT_ENV: 'dev' as const,
  networkToEnv: { devnet: 'dev', testnet: 'testnet', 'mainnet-beta': 'prod' },
  getConfig: vi.fn(() => fullConfig),
}));

vi.mock('../../const/rpcUrls', () => ({
  getConnection: vi.fn(() => mockConnection),
}));

vi.mock('@lombard.finance/sdk-common', () => ({
  getOutputScript: vi.fn().mockResolvedValue('0x001234abcd'),
}));

vi.mock('../../utils/tokenAccount', () => ({
  getTokenProgramForMint: vi
    .fn()
    .mockResolvedValue(
      new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    ),
}));

vi.mock('../../idl/getAssetRouterIdl', () => ({
  getAssetRouterIdl: vi.fn(() => ({
    address: MOCK_ASSET_ROUTER,
    metadata: { name: 'asset_router', version: '0.1.0', spec: '0.1.0' },
    instructions: [],
  })),
}));

// Mock Program constructor — needed by redeemForBtc to create assetRouterProgram
vi.mock('@coral-xyz/anchor', () => ({
  Program: vi.fn().mockImplementation(() => ({})),
}));

// Build AR config data: 8 (disc) + 32 (admin) + 32 (pending_admin) + 32 (treasury) + 1 (paused=0)
function buildArConfigData(paused = false) {
  const data = Buffer.alloc(105, 0);
  const treasury = new PublicKey(
    '8yarEiDaJVikHZbk3PQSoWiDn2T3oM1FHZN1Jv4VZFdr',
  );
  treasury.toBuffer().copy(data, 72);
  data[104] = paused ? 1 : 0;
  return data;
}

// Build mailbox config data: 8 (disc) + 32 (admin) + 32 (pending_admin) + 32 (treasury) = 104
function buildMailboxConfigData() {
  const data = Buffer.alloc(104, 0);
  const treasury = new PublicKey(
    '8yarEiDaJVikHZbk3PQSoWiDn2T3oM1FHZN1Jv4VZFdr',
  );
  treasury.toBuffer().copy(data, 72);
  return data;
}

const mockConnection = {
  getAccountInfo: vi.fn().mockImplementation((pubkey: PublicKey) => {
    const key = pubkey.toBase58();
    const [arPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('asset_router_config')],
      new PublicKey(MOCK_ASSET_ROUTER),
    );
    if (key === arPDA.toBase58()) {
      return Promise.resolve({ data: buildArConfigData() });
    }
    return Promise.resolve({ data: buildMailboxConfigData() });
  }),
};

const mockProvider = { publicKey: MOCK_PAYER };

const baseParams = {
  amount: '100000',
  btcAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  network: SolanaNetwork.devnet,
  tokenMint: MOCK_BTCB_MINT,
};

describe('redeemForBtc', () => {
  let redeemForBtcFn: typeof import('./redeemForBtc').redeemForBtc;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Re-establish default mock implementations cleared by previous tests
    mockConnection.getAccountInfo.mockImplementation((pubkey: PublicKey) => {
      const [arPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('asset_router_config')],
        new PublicKey(MOCK_ASSET_ROUTER),
      );
      if (pubkey.toBase58() === arPDA.toBase58()) {
        return Promise.resolve({ data: buildArConfigData() });
      }
      return Promise.resolve({ data: buildMailboxConfigData() });
    });

    const mod = await import('./redeemForBtc');
    redeemForBtcFn = mod.redeemForBtc;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Validation ──

  it('should throw when wallet is not connected', async () => {
    const noWalletProvider = { publicKey: null };

    await expect(
      redeemForBtcFn(noWalletProvider as any, baseParams),
    ).rejects.toThrow('Wallet not connected');
  });

  it('should throw when Asset Router is not configured', async () => {
    const { getConfig } = await import('../../const/getConfig');
    vi.mocked(getConfig).mockReturnValueOnce({
      ...fullConfig,
      assetRouter: null,
    });

    await expect(
      redeemForBtcFn(mockProvider as any, baseParams),
    ).rejects.toThrow('Asset Router not configured');
  });

  it('should throw when Mailbox is not configured', async () => {
    const { getConfig } = await import('../../const/getConfig');
    vi.mocked(getConfig).mockReturnValueOnce({ ...fullConfig, mailbox: null });

    await expect(
      redeemForBtcFn(mockProvider as any, baseParams),
    ).rejects.toThrow('Mailbox not configured');
  });

  it('should throw when Solana routing chain ID is not configured', async () => {
    const { getConfig } = await import('../../const/getConfig');
    vi.mocked(getConfig).mockReturnValueOnce({
      ...fullConfig,
      solanaRoutingChainId: null,
    });

    await expect(
      redeemForBtcFn(mockProvider as any, baseParams),
    ).rejects.toThrow('Solana routing chain ID not configured');
  });

  it('should throw when Bitcoin routing chain ID is not configured', async () => {
    const { getConfig } = await import('../../const/getConfig');
    vi.mocked(getConfig).mockReturnValueOnce({
      ...fullConfig,
      bitcoinRoutingChainId: null,
    });

    await expect(
      redeemForBtcFn(mockProvider as any, baseParams),
    ).rejects.toThrow('Bitcoin routing chain ID not configured');
  });

  it('should throw when tokenMint is BTC.b but env has no BTC.b mint configured', async () => {
    const { getConfig } = await import('../../const/getConfig');
    vi.mocked(getConfig).mockReturnValueOnce({
      ...fullConfig,
      btcbTokenMint: null,
    });

    await expect(
      redeemForBtcFn(mockProvider as any, baseParams),
    ).rejects.toThrow(/Unsupported tokenMint for redeemForBtc/);
  });

  it('should throw when tokenMint override is not LBTC or BTC.b for the network', async () => {
    const foreignMint = 'So11111111111111111111111111111111111111112';

    await expect(
      redeemForBtcFn(mockProvider as any, {
        ...baseParams,
        tokenMint: foreignMint,
      }),
    ).rejects.toThrow(/Unsupported tokenMint for redeemForBtc/);

    expect(mockRedeemBtcbForBtc).not.toHaveBeenCalled();
    expect(mockRedeemLbtcForBtc).not.toHaveBeenCalled();
  });

  it('should throw when amount is invalid', async () => {
    await expect(
      redeemForBtcFn(mockProvider as any, { ...baseParams, amount: '0' }),
    ).rejects.toThrow('greater than zero');
  });

  it('should throw when Asset Router is paused', async () => {
    const arPDA = PublicKey.findProgramAddressSync(
      [Buffer.from('asset_router_config')],
      new PublicKey(MOCK_ASSET_ROUTER),
    )[0];

    mockConnection.getAccountInfo.mockImplementation((pubkey: PublicKey) => {
      if (pubkey.toBase58() === arPDA.toBase58()) {
        return Promise.resolve({ data: buildArConfigData(true) });
      }
      return Promise.resolve({ data: buildMailboxConfigData() });
    });

    await expect(
      redeemForBtcFn(mockProvider as any, baseParams),
    ).rejects.toThrow('Asset Router is paused');
  });

  // ── Routing ──

  it('should route to redeemBtcbForBtc when tokenMint is the configured BTC.b mint', async () => {
    await redeemForBtcFn(mockProvider as any, baseParams);

    expect(mockRedeemBtcbForBtc).toHaveBeenCalledTimes(1);
    expect(mockRedeemLbtcForBtc).not.toHaveBeenCalled();
  });

  it('should route to redeemLbtcForBtc when tokenMint equals LBTC mint', async () => {
    await redeemForBtcFn(mockProvider as any, {
      ...baseParams,
      tokenMint: MOCK_LBTC_MINT,
    });

    expect(mockRedeemLbtcForBtc).toHaveBeenCalledTimes(1);
    expect(mockRedeemBtcbForBtc).not.toHaveBeenCalled();
  });

  it('should route to redeemBtcbForBtc when tokenMint is explicitly BTC.b', async () => {
    await redeemForBtcFn(mockProvider as any, {
      ...baseParams,
      tokenMint: MOCK_BTCB_MINT,
    });

    expect(mockRedeemBtcbForBtc).toHaveBeenCalledTimes(1);
    expect(mockRedeemLbtcForBtc).not.toHaveBeenCalled();
  });

  it('should pass correct RedeemContext to sub-flow', async () => {
    await redeemForBtcFn(mockProvider as any, baseParams);

    const ctx = mockRedeemBtcbForBtc.mock.calls[0][0];
    expect(ctx.payer).toEqual(new PublicKey(MOCK_PAYER));
    expect(ctx.mint).toEqual(new PublicKey(MOCK_BTCB_MINT));
    expect(ctx.assetRouterProgramId).toEqual(new PublicKey(MOCK_ASSET_ROUTER));
    expect(ctx.mailboxProgramId).toEqual(new PublicKey(MOCK_MAILBOX));
    expect(ctx.env).toBe('dev');
    expect(ctx.config).toBe(fullConfig);
    expect(ctx.scriptPubKey).toBeInstanceOf(Buffer);
    expect(ctx.scriptPubKey.length).toBeGreaterThan(0);
  });

  // ── Error wrapping ──

  it('should wrap errors with SolanaSdkError', async () => {
    const { getConfig } = await import('../../const/getConfig');
    vi.mocked(getConfig).mockReturnValueOnce({
      ...fullConfig,
      assetRouter: null,
    });

    try {
      await redeemForBtcFn(mockProvider as any, baseParams);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SolanaSdkError);
      expect((err as SolanaSdkError).code).toBe(ErrorCode.REDEEM_REJECTED);
    }
  });

  it('should use env override when provided', async () => {
    const { getConfig } = await import('../../const/getConfig');

    await redeemForBtcFn(mockProvider as any, {
      ...baseParams,
      env: 'stage',
    });

    expect(getConfig).toHaveBeenCalledWith('stage');
  });
});
