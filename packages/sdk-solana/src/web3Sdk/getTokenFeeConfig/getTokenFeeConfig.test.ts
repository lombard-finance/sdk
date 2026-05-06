import { PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IConfig } from '../../const/getConfig';
import { SolanaNetwork } from '../../types';
import { ErrorCode, SolanaSdkError } from '../../utils';

// ── Constants ──

const MOCK_LBTC_MINT = 'LBTCojyVJ63rsEED2DLEGWMzSxWJyQynXE91LMLgV1J';
const MOCK_BTCB_MINT = 'BTCB3ripBAut19jM8kDPVbJHb2ZdR2GcZvGZkCmFPtV8';
const MOCK_ASSET_ROUTER = 'LomVyJDZ91jeVbNnTupJXKJTQFakJVMc87CmwDHYt95';

const fullConfig: IConfig = {
  lbtcTokenMint: MOCK_LBTC_MINT,
  btcbTokenMint: MOCK_BTCB_MINT,
  assetRouter: MOCK_ASSET_ROUTER,
  mailbox: 'LomJw912MoUd7iiAesTQAgz1paLcTqi6ndG3w3pnKH9',
  solanaRoutingChainId:
    '0259db5080fc2c6d3bcf7ca90712d3c2e5e6c28f27f0dfbb9953bdb0894c03ab',
  bitcoinRoutingChainId:
    'ff000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6',
  ledgerChainId:
    '031f51c4e4cc1dae1c752d2f8fe2ae045da668a13f2e47a465964d630f5ed22e',
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

// ── Helpers ──

/**
 * Build a fake TokenConfig account buffer.
 *
 * Layout (Anchor): discriminator(8) + redeem_fee(u64) +
 *   redeem_for_btc_min_amount(u64) + max_mint_commission(u64) +
 *   to_native_commission(u64) + ledger_redeem_handler([u8; 32])
 */
function buildTokenConfigData(fields: {
  redeemFee: bigint;
  redeemForBtcMinAmount: bigint;
  maxMintCommission: bigint;
  toNativeCommission: bigint;
}): Buffer {
  const buf = Buffer.alloc(8 + 8 + 8 + 8 + 8 + 32, 0);
  buf.writeBigUInt64LE(fields.redeemFee, 8);
  buf.writeBigUInt64LE(fields.redeemForBtcMinAmount, 16);
  buf.writeBigUInt64LE(fields.maxMintCommission, 24);
  buf.writeBigUInt64LE(fields.toNativeCommission, 32);
  return buf;
}

// ── Mocks ──

const mockConnection = {
  getAccountInfo: vi.fn(),
};

vi.mock('../../const/getConfig', () => ({
  DEFAULT_ENV: 'dev' as const,
  getConfig: vi.fn(() => fullConfig),
}));

vi.mock('../../const/rpcUrls', () => ({
  getConnection: vi.fn(() => mockConnection),
}));

// ── Tests ──

describe('getTokenFeeConfig', () => {
  let getTokenFeeConfigFn: typeof import('./getTokenFeeConfig').getTokenFeeConfig;
  let getRedeemFeeSolanaFn: typeof import('./getTokenFeeConfig').getRedeemFeeSolana;
  let getMintingFeeSolanaFn: typeof import('./getTokenFeeConfig').getMintingFeeSolana;
  let getMinRedeemAmountSolanaFn: typeof import('./getTokenFeeConfig').getMinRedeemAmountSolana;
  let getMinRedeemAmountWithFeeSolanaFn: typeof import('./getTokenFeeConfig').getMinRedeemAmountWithFeeSolana;

  const defaultFields = {
    redeemFee: 1000n,
    redeemForBtcMinAmount: 2000n,
    maxMintCommission: 500n,
    toNativeCommission: 300n,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockConnection.getAccountInfo.mockResolvedValue({
      data: buildTokenConfigData(defaultFields),
    });

    const mod = await import('./getTokenFeeConfig');
    getTokenFeeConfigFn = mod.getTokenFeeConfig;
    getRedeemFeeSolanaFn = mod.getRedeemFeeSolana;
    getMintingFeeSolanaFn = mod.getMintingFeeSolana;
    getMinRedeemAmountSolanaFn = mod.getMinRedeemAmountSolana;
    getMinRedeemAmountWithFeeSolanaFn = mod.getMinRedeemAmountWithFeeSolana;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const baseParams = { network: SolanaNetwork.devnet };

  // ── getTokenFeeConfig ──

  it('should parse all token config fields correctly', async () => {
    const result = await getTokenFeeConfigFn(baseParams);

    expect(result.redeemFee).toEqual(new BigNumber('0.00001'));
    expect(result.redeemForBtcMinAmount).toEqual(new BigNumber('0.00002'));
    expect(result.maxMintCommission).toEqual(new BigNumber('0.000005'));
    expect(result.toNativeCommission).toEqual(new BigNumber('0.000003'));
  });

  it('should derive PDA from LBTC mint by default', async () => {
    await getTokenFeeConfigFn(baseParams);

    const mint = new PublicKey(MOCK_LBTC_MINT);
    const assetRouter = new PublicKey(MOCK_ASSET_ROUTER);
    const [expectedPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('token_config'), mint.toBuffer()],
      assetRouter,
    );

    expect(mockConnection.getAccountInfo).toHaveBeenCalledWith(expectedPDA);
  });

  it('should use custom tokenMint when provided', async () => {
    await getTokenFeeConfigFn({ ...baseParams, tokenMint: MOCK_BTCB_MINT });

    const mint = new PublicKey(MOCK_BTCB_MINT);
    const assetRouter = new PublicKey(MOCK_ASSET_ROUTER);
    const [expectedPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('token_config'), mint.toBuffer()],
      assetRouter,
    );

    expect(mockConnection.getAccountInfo).toHaveBeenCalledWith(expectedPDA);
  });

  it('should throw when Asset Router is not configured', async () => {
    const { getConfig } = await import('../../const/getConfig');
    vi.mocked(getConfig).mockReturnValueOnce({
      ...fullConfig,
      assetRouter: null,
    });

    await expect(getTokenFeeConfigFn(baseParams)).rejects.toThrow(
      'Asset Router not configured',
    );
  });

  it('should throw when account is not found', async () => {
    mockConnection.getAccountInfo.mockResolvedValueOnce(null);

    try {
      await getTokenFeeConfigFn(baseParams);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SolanaSdkError);
      expect((err as SolanaSdkError).code).toBe(ErrorCode.RPC_ERROR);
    }
  });

  it('should throw when account data is too short', async () => {
    mockConnection.getAccountInfo.mockResolvedValueOnce({
      data: Buffer.alloc(10, 0),
    });

    try {
      await getTokenFeeConfigFn(baseParams);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SolanaSdkError);
      expect((err as SolanaSdkError).code).toBe(ErrorCode.RPC_ERROR);
    }
  });

  it('should use env override when provided', async () => {
    const { getConfig } = await import('../../const/getConfig');

    await getTokenFeeConfigFn({ ...baseParams, env: 'stage' });

    expect(getConfig).toHaveBeenCalledWith('stage');
  });

  // ── Convenience wrappers ──

  it('getRedeemFeeSolana should return toNativeCommission + redeemFee', async () => {
    const result = await getRedeemFeeSolanaFn(baseParams);
    // 300 + 1000 = 1300 satoshi = 0.000013
    expect(result).toEqual(new BigNumber('0.000013'));
  });

  it('getMintingFeeSolana should return maxMintCommission', async () => {
    const result = await getMintingFeeSolanaFn(baseParams);
    // 500 satoshi = 0.000005
    expect(result).toEqual(new BigNumber('0.000005'));
  });

  it('getMinRedeemAmountSolana should return redeemForBtcMinAmount', async () => {
    const result = await getMinRedeemAmountSolanaFn(baseParams);
    // 2000 satoshi = 0.00002
    expect(result).toEqual(new BigNumber('0.00002'));
  });

  it('getMinRedeemAmountWithFeeSolana should return total of all fees + min amount', async () => {
    const result = await getMinRedeemAmountWithFeeSolanaFn(baseParams);
    // 300 + 1000 + 2000 = 3300 satoshi = 0.000033
    expect(result).toEqual(new BigNumber('0.000033'));
  });
});
