import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { depositEarn } from '../../../contract-functions/depositEarn/depositEarn';
import { Token } from '../../../tokens/token-addresses';

const mockReadContract = vi.fn();
const mockSimulateContract = vi.fn();
const mockWriteContract = vi.fn();
const mockWaitForReceipt = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    readContract: (...args: unknown[]) => mockReadContract(...args),
    simulateContract: (...args: unknown[]) => mockSimulateContract(...args),
    waitForTransactionReceipt: (...args: unknown[]) =>
      mockWaitForReceipt(...args) })) }));

vi.mock('../../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({
    writeContract: (...args: unknown[]) => mockWriteContract(...args) })) }));

vi.mock('../../../tokens/tokens', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getTokenInfo: vi.fn().mockResolvedValue({
      address: '0x8236a87084f8B84306f72007F36F2618A5634494',
      abi: [],
      symbol: 'LBTC',
      decimals: 8 }) };
});

const ACCOUNT = '0x000000000000000000000000000000000000dEaD';
const BTCE_ADDR = '0x3a4baaBf4DC9910596821615e848f0e6545762F3';
const LBTC_ADDR = '0x8236a87084f8B84306f72007F36F2618A5634494';
const PROVIDER = {
  request: vi.fn() } as unknown as Parameters<typeof depositEarn>[0]['provider'];

describe('depositEarn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSimulateContract.mockResolvedValue({
      request: { address: BTCE_ADDR, abi: [], functionName: 'deposit' } });
    mockWriteContract.mockResolvedValue('0xtxhash');
    mockWaitForReceipt.mockResolvedValue({
      status: 'success',
      transactionHash: '0xapprovehash' });
  });

  describe('happy path with sufficient existing allowance', () => {
    it('skips approval and calls BTCe.deposit directly', async () => {
      mockReadContract.mockResolvedValueOnce(BigInt(2 ** 64)); // huge allowance

      const hash = await depositEarn({
        token: Token.LBTC,
        amount: '0.5',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER });

      expect(hash).toBe('0xtxhash');
      // 1 read (allowance), 0 approval simulate, 1 deposit simulate, 1 write
      expect(mockReadContract).toHaveBeenCalledTimes(1);
      expect(mockReadContract.mock.calls[0][0].functionName).toBe('allowance');
      expect(mockSimulateContract).toHaveBeenCalledTimes(1);
      expect(mockSimulateContract.mock.calls[0][0].functionName).toBe(
        'deposit',
      );
      expect(mockSimulateContract.mock.calls[0][0].address).toBe(BTCE_ADDR);
    });
  });

  describe('happy path needing approval', () => {
    it('approves first, waits for receipt, then deposits', async () => {
      mockReadContract.mockResolvedValueOnce(0n); // no allowance

      const hash = await depositEarn({
        token: Token.LBTC,
        amount: '0.5',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER });

      expect(hash).toBe('0xtxhash');
      // simulate count: 1 approve + 1 deposit
      expect(mockSimulateContract).toHaveBeenCalledTimes(2);
      const approveCall = mockSimulateContract.mock.calls[0][0];
      expect(approveCall.functionName).toBe('approve');
      expect(approveCall.address).toBe(LBTC_ADDR);
      expect(approveCall.args[0]).toBe(BTCE_ADDR);

      const depositCall = mockSimulateContract.mock.calls[1][0];
      expect(depositCall.functionName).toBe('deposit');
      expect(depositCall.address).toBe(BTCE_ADDR);

      // Two writes (approve + deposit), one receipt wait between them
      expect(mockWriteContract).toHaveBeenCalledTimes(2);
      expect(mockWaitForReceipt).toHaveBeenCalledTimes(1);
    });
  });

  describe('approve flag', () => {
    it('throws instead of approving when approve: false and allowance insufficient', async () => {
      mockReadContract.mockResolvedValueOnce(0n);

      await expect(
        depositEarn({
          token: Token.LBTC,
          amount: '0.5',
          approve: false,
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER }),
      ).rejects.toThrow(/exceeds allowance/);

      expect(mockSimulateContract).not.toHaveBeenCalled();
      expect(mockWriteContract).not.toHaveBeenCalled();
    });
  });

  describe('chain support', () => {
    it.each([
      ['Ethereum', ChainId.ethereum],
      ['Base', ChainId.base],
      ['BSC', ChainId.binanceSmartChain],
    ] as const)('supports %s', async (_label, chainId) => {
      mockReadContract.mockResolvedValueOnce(BigInt(2 ** 64));

      await expect(
        depositEarn({
          token: Token.LBTC,
          amount: '0.1',
          account: ACCOUNT,
          chainId,
          provider: PROVIDER }),
      ).resolves.toBe('0xtxhash');
    });

    it('throws on unsupported chain (Corn)', async () => {
      await expect(
        depositEarn({
          token: Token.LBTC,
          amount: '0.1',
          account: ACCOUNT,
          chainId: ChainId.corn,
          provider: PROVIDER }),
      ).rejects.toThrow(/BTCe is not supported on chain/);
    });
  });

  describe('input validation', () => {
    it('throws for zero amount', async () => {
      await expect(
        depositEarn({
          token: Token.LBTC,
          amount: '0',
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER }),
      ).rejects.toThrow(/must be greater than zero/);
    });

    it('throws for negative amount', async () => {
      await expect(
        depositEarn({
          token: Token.LBTC,
          amount: '-0.1',
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER }),
      ).rejects.toThrow(/must be greater than zero/);
    });
  });
});
