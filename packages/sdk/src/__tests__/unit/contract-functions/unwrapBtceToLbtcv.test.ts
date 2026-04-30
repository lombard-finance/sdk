import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { unwrapBtceToLbtcv } from '../../../contract-functions/unwrapBtceToLbtcv/unwrapBtceToLbtcv';

const mockReadContract = vi.fn();
const mockSimulateContract = vi.fn();
const mockWriteContract = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    readContract: (...args: unknown[]) => mockReadContract(...args),
    simulateContract: (...args: unknown[]) => mockSimulateContract(...args) })) }));

vi.mock('../../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({
    writeContract: (...args: unknown[]) => mockWriteContract(...args) })) }));

const ACCOUNT = '0x000000000000000000000000000000000000dEaD';
const RECEIVER = '0x000000000000000000000000000000000000bEEf';
const OWNER = '0x000000000000000000000000000000000000c0dE';
const BTCE_ADDR = '0x3a4baaBf4DC9910596821615e848f0e6545762F3';
const PROVIDER = {
  request: vi.fn() } as unknown as Parameters<typeof unwrapBtceToLbtcv>[0]['provider'];

describe('unwrapBtceToLbtcv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default maxWithdraw: 1 LBTCv equivalent (in base units)
    mockReadContract.mockResolvedValue(100_000_000n);
    mockSimulateContract.mockResolvedValue({
      request: { address: BTCE_ADDR, abi: [], functionName: 'withdraw' } });
    mockWriteContract.mockResolvedValue('0xtxhash');
  });

  describe('happy path', () => {
    it('calls withdraw(assetsBase, receiver, owner) on the BTCe contract', async () => {
      await unwrapBtceToLbtcv({
        amount: '0.5',
        receiver: RECEIVER,
        owner: OWNER,
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER });

      // First reads maxWithdraw, then simulates withdraw
      expect(mockReadContract).toHaveBeenCalledTimes(1);
      const readArgs = mockReadContract.mock.calls[0][0];
      expect(readArgs.functionName).toBe('maxWithdraw');
      expect(readArgs.address).toBe(BTCE_ADDR);
      expect(readArgs.args).toEqual([OWNER]);

      expect(mockSimulateContract).toHaveBeenCalledTimes(1);
      const simArgs = mockSimulateContract.mock.calls[0][0];
      expect(simArgs.functionName).toBe('withdraw');
      expect(simArgs.address).toBe(BTCE_ADDR);
      expect(simArgs.account).toBe(ACCOUNT);
      // [assetsBase, receiver, owner]
      expect(simArgs.args[0]).toBe(50_000_000n);
      expect(simArgs.args[1]).toBe(RECEIVER);
      expect(simArgs.args[2]).toBe(OWNER);
    });

    it('returns the transaction hash from writeContract', async () => {
      mockWriteContract.mockResolvedValueOnce('0xfeedface');

      const hash = await unwrapBtceToLbtcv({
        amount: '0.1',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER });

      expect(hash).toBe('0xfeedface');
    });

    it('defaults receiver and owner to account when not provided', async () => {
      await unwrapBtceToLbtcv({
        amount: '0.25',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER });

      // maxWithdraw queried for the implicit owner (account)
      expect(mockReadContract.mock.calls[0][0].args).toEqual([ACCOUNT]);

      const simArgs = mockSimulateContract.mock.calls[0][0];
      expect(simArgs.args[1]).toBe(ACCOUNT); // receiver
      expect(simArgs.args[2]).toBe(ACCOUNT); // owner
    });
  });

  describe('maxWithdraw guard', () => {
    it('throws when requested amount exceeds maxWithdraw', async () => {
      mockReadContract.mockResolvedValueOnce(30_000_000n); // 0.3 LBTCv max

      await expect(
        unwrapBtceToLbtcv({
          amount: '0.5',
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER }),
      ).rejects.toThrow(/exceeds maxWithdraw/);

      expect(mockSimulateContract).not.toHaveBeenCalled();
      expect(mockWriteContract).not.toHaveBeenCalled();
    });

    it('throws when maxWithdraw is zero (nothing to unwrap)', async () => {
      mockReadContract.mockResolvedValueOnce(0n);

      await expect(
        unwrapBtceToLbtcv({
          amount: '0.01',
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER }),
      ).rejects.toThrow(/exceeds maxWithdraw/);
    });

    it('proceeds when amount equals maxWithdraw exactly', async () => {
      mockReadContract.mockResolvedValueOnce(50_000_000n);

      await expect(
        unwrapBtceToLbtcv({
          amount: '0.5',
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER }),
      ).resolves.toBe('0xtxhash');
    });
  });

  describe('chain support', () => {
    it.each([
      ['Ethereum', ChainId.ethereum],
      ['Base', ChainId.base],
      ['BSC', ChainId.binanceSmartChain],
    ] as const)('supports %s', async (_label, chainId) => {
      await expect(
        unwrapBtceToLbtcv({
          amount: '0.1',
          account: ACCOUNT,
          chainId,
          provider: PROVIDER }),
      ).resolves.toBe('0xtxhash');
    });

    it('throws on an unsupported chain (Corn)', async () => {
      await expect(
        unwrapBtceToLbtcv({
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
        unwrapBtceToLbtcv({
          amount: '0',
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER }),
      ).rejects.toThrow(/must be greater than zero/);
    });

    it('throws for negative amount', async () => {
      await expect(
        unwrapBtceToLbtcv({
          amount: '-0.1',
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER }),
      ).rejects.toThrow(/must be greater than zero/);
    });

    it('throws for invalid receiver address', async () => {
      await expect(
        unwrapBtceToLbtcv({
          amount: '0.1',
          receiver: '0xnotanaddress' as `0x${string}`,
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER }),
      ).rejects.toThrow(/Invalid receiver address/);
    });

    it('throws for invalid owner address', async () => {
      await expect(
        unwrapBtceToLbtcv({
          amount: '0.1',
          owner: '0xnotanaddress' as `0x${string}`,
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER }),
      ).rejects.toThrow(/Invalid owner address/);
    });
  });

  describe('error propagation', () => {
    it('surfaces simulateContract reverts', async () => {
      mockSimulateContract.mockRejectedValueOnce(
        new Error('execution reverted: ERC4626ExceededMaxWithdraw'),
      );

      await expect(
        unwrapBtceToLbtcv({
          amount: '0.1',
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER }),
      ).rejects.toThrow(/ERC4626ExceededMaxWithdraw/);
    });
  });
});
