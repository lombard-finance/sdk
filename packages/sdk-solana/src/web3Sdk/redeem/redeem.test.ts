import { PublicKey } from '@solana/web3.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IConfig } from '../../const/getConfig';
import { SolanaNetwork } from '../../types';
import { ErrorCode, SolanaSdkError } from '../../utils';

// ── Constants ──

const MOCK_LBTC_MINT = 'LBTCojyVJ63rsEED2DLEGWMzSxWJyQynXE91LMLgV1J';
const MOCK_BTCB_MINT = 'BTCB3ripBAut19jM8kDPVbJHb2ZdR2GcZvGZkCmFPtV8';
const MOCK_ASSET_ROUTER = 'LomVyJDZ91jeVbNnTupJXKJTQFakJVMc87CmwDHYt95';
const MOCK_MAILBOX = 'LomJw912MoUd7iiAesTQAgz1paLcTqi6ndG3w3pnKH9';
const MOCK_SOLANA_CHAIN_ID = '0259db5080fc2c6d3bcf7ca90712d3c2e5e6c28f27f0dfbb9953bdb0894c03ab';
const MOCK_LEDGER_CHAIN_ID = '031f51c4e4cc1dae1c752d2f8fe2ae045da668a13f2e47a465964d630f5ed22e';
const MOCK_PAYER = '8yarEiDaJVikHZbk3PQSoWiDn2T3oM1FHZN1Jv4VZFdr';
const MOCK_RECIPIENT = 'DVMiNi7uxHEPABTBt1nLMoxnPniPKbLAFj4MPJq1RDjg';

const fullConfig: IConfig = {
  lbtcTokenMint: MOCK_LBTC_MINT,
  btcbTokenMint: MOCK_BTCB_MINT,
  assetRouter: MOCK_ASSET_ROUTER,
  mailbox: MOCK_MAILBOX,
  solanaRoutingChainId: MOCK_SOLANA_CHAIN_ID,
  bitcoinRoutingChainId: 'ff000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6',
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

// ── Mocks ──

vi.mock('../../const/getConfig', () => ({
  DEFAULT_ENV: 'dev' as const,
  networkToEnv: { devnet: 'dev', testnet: 'testnet', 'mainnet-beta': 'prod' },
  getConfig: vi.fn(() => fullConfig),
}));

// Build AR config data: 8 (disc) + 32 (admin) + 32 (pending_admin) + 32 (treasury) + 1 (paused=0) = 105
function buildArConfigData(paused = false) {
  const data = Buffer.alloc(145, 0);
  const treasury = new PublicKey(MOCK_PAYER);
  treasury.toBuffer().copy(data, 72);
  data[104] = paused ? 1 : 0;
  // global_nonce (u64 LE) at offset 137 → set to 42
  data.writeBigUInt64LE(42n, 137);
  return data;
}

function buildMailboxConfigData() {
  const data = Buffer.alloc(145, 0);
  const treasury = new PublicKey(MOCK_PAYER);
  treasury.toBuffer().copy(data, 72);
  data.writeBigUInt64LE(42n, 137);
  return data;
}

const arConfigPDA = PublicKey.findProgramAddressSync(
  [Buffer.from('asset_router_config')],
  new PublicKey(MOCK_ASSET_ROUTER),
)[0];

function defaultGetAccountInfo(pubkey: PublicKey) {
  if (pubkey.toBase58() === arConfigPDA.toBase58()) {
    return Promise.resolve({ data: buildArConfigData() });
  }
  return Promise.resolve({ data: buildMailboxConfigData() });
}

const mockConnection = {
  getAccountInfo: vi.fn().mockImplementation(defaultGetAccountInfo),
  getTokenAccountBalance: vi.fn().mockResolvedValue({
    value: { amount: '999999999', uiAmountString: '9.99' },
  }),
};

vi.mock('../../const/rpcUrls', () => ({
  getConnection: vi.fn(() => mockConnection),
}));

vi.mock('../../utils/tokenAccount', () => ({
  getTokenProgramForMint: vi.fn().mockResolvedValue(new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')),
}));

vi.mock('../../idl/getAssetRouterIdl', () => ({
  getAssetRouterIdl: vi.fn(() => ({
    address: MOCK_ASSET_ROUTER,
    metadata: { name: 'asset_router', version: '0.1.0', spec: '0.1.0' },
    instructions: [],
  })),
}));

vi.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: vi.fn().mockResolvedValue(new PublicKey(MOCK_PAYER)),
  ASSOCIATED_TOKEN_PROGRAM_ID: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
}));

const mockTx = { instructions: [{ keys: [] }] };
const mockMethods = {
  redeem: vi.fn().mockReturnValue({
    accounts: vi.fn().mockReturnValue({
      transaction: vi.fn().mockResolvedValue(mockTx),
    }),
  }),
};

vi.mock('@coral-xyz/anchor', () => ({
  Program: vi.fn().mockImplementation(() => ({ methods: mockMethods })),
  BN: vi.fn().mockImplementation((v: string) => ({ toString: () => v })),
}));

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    sendAndConfirmTransaction: vi.fn().mockResolvedValue({ signature: 'mock-redeem-sig' }),
  };
});

const baseParams = {
  amount: '100000',
  recipient: MOCK_RECIPIENT,
  network: SolanaNetwork.devnet,
};

describe('redeem', () => {
  let redeemFn: typeof import('./redeem').redeem;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockConnection.getAccountInfo.mockImplementation(defaultGetAccountInfo);
    mockConnection.getTokenAccountBalance.mockResolvedValue({
      value: { amount: '999999999', uiAmountString: '9.99' },
    });
    const mod = await import('./redeem');
    redeemFn = mod.redeem;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Validation ──

  it('should throw when wallet is not connected', async () => {
    await expect(
      redeemFn({ publicKey: null } as any, baseParams),
    ).rejects.toThrow('Wallet not connected');
  });

  it('should throw when Asset Router is not configured', async () => {
    const { getConfig } = await import('../../const/getConfig');
    vi.mocked(getConfig).mockReturnValueOnce({ ...fullConfig, assetRouter: null });

    await expect(
      redeemFn({ publicKey: MOCK_PAYER } as any, baseParams),
    ).rejects.toThrow('Asset Router not configured');
  });

  it('should throw when Mailbox is not configured', async () => {
    const { getConfig } = await import('../../const/getConfig');
    vi.mocked(getConfig).mockReturnValueOnce({ ...fullConfig, mailbox: null });

    await expect(
      redeemFn({ publicKey: MOCK_PAYER } as any, baseParams),
    ).rejects.toThrow('Mailbox not configured');
  });

  it('should throw when Solana routing chain ID is not configured', async () => {
    const { getConfig } = await import('../../const/getConfig');
    vi.mocked(getConfig).mockReturnValueOnce({ ...fullConfig, solanaRoutingChainId: null });

    await expect(
      redeemFn({ publicKey: MOCK_PAYER } as any, baseParams),
    ).rejects.toThrow('Solana routing chain ID not configured');
  });

  it('should throw when source token mint is not resolved', async () => {
    const { getConfig } = await import('../../const/getConfig');
    vi.mocked(getConfig).mockReturnValueOnce({ ...fullConfig, lbtcTokenMint: '' });

    await expect(
      redeemFn({ publicKey: MOCK_PAYER } as any, baseParams),
    ).rejects.toThrow('Source token mint not configured');
  });

  it('should throw when destination token is not configured', async () => {
    const { getConfig } = await import('../../const/getConfig');
    vi.mocked(getConfig).mockReturnValueOnce({ ...fullConfig, btcbTokenMint: null });

    await expect(
      redeemFn({ publicKey: MOCK_PAYER } as any, baseParams),
    ).rejects.toThrow('Destination token not configured');
  });

  it('should throw when amount is zero', async () => {
    await expect(
      redeemFn({ publicKey: MOCK_PAYER } as any, { ...baseParams, amount: '0' }),
    ).rejects.toThrow('greater than zero');
  });

  it('should throw when Asset Router is paused', async () => {
    mockConnection.getAccountInfo.mockImplementation((pubkey: PublicKey) => {
      if (pubkey.toBase58() === arConfigPDA.toBase58()) {
        return Promise.resolve({ data: buildArConfigData(true) });
      }
      return Promise.resolve({ data: buildMailboxConfigData() });
    });

    await expect(
      redeemFn({ publicKey: MOCK_PAYER } as any, baseParams),
    ).rejects.toThrow('Asset Router is paused');
  });

  it('should throw on insufficient balance', async () => {
    mockConnection.getTokenAccountBalance.mockResolvedValue({
      value: { amount: '10', uiAmountString: '0.0000001' },
    });

    await expect(
      redeemFn({ publicKey: MOCK_PAYER } as any, baseParams),
    ).rejects.toThrow('Insufficient balance');
  });

  it('should throw when Ledger chain ID is not configured', async () => {
    const { getConfig } = await import('../../const/getConfig');
    vi.mocked(getConfig).mockReturnValueOnce({ ...fullConfig, ledgerChainId: null });

    await expect(
      redeemFn({ publicKey: MOCK_PAYER } as any, baseParams),
    ).rejects.toThrow('Ledger chain ID not configured');
  });

  // ── Success path ──

  it('should return transaction signature on success', async () => {
    mockConnection.getAccountInfo.mockResolvedValue({ data: buildMailboxConfigData() });

    const sig = await redeemFn({ publicKey: MOCK_PAYER } as any, baseParams);

    expect(sig).toBe('mock-redeem-sig');
  });

  // ── Error wrapping ──

  it('should wrap errors with SolanaSdkError', async () => {
    const { getConfig } = await import('../../const/getConfig');
    vi.mocked(getConfig).mockReturnValueOnce({ ...fullConfig, assetRouter: null });

    try {
      await redeemFn({ publicKey: MOCK_PAYER } as any, baseParams);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SolanaSdkError);
      expect((err as SolanaSdkError).code).toBe(ErrorCode.UNSTAKE_REJECTED);
    }
  });

  it('should use env override when provided', async () => {
    mockConnection.getAccountInfo.mockResolvedValue({ data: buildMailboxConfigData() });

    const { getConfig } = await import('../../const/getConfig');

    await redeemFn({ publicKey: MOCK_PAYER } as any, {
      ...baseParams,
      env: 'stage',
    });

    expect(getConfig).toHaveBeenCalledWith('stage');
  });
});
