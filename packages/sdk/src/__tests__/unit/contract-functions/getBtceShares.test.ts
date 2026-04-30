import BigNumber from 'bignumber.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { getBtceShares } from '../../../contract-functions/getBtceShares/getBtceShares';

const mockReadContract = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn().mockReturnValue({
    readContract: (...args: unknown[]) => mockReadContract(...args) }) }));

const TEST_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const BTCE_ADDRESS = '0x3a4baaBf4DC9910596821615e848f0e6545762F3';

describe('getBtceShares', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('returns the BTCe share balance as an 8-decimal BigNumber', async () => {
      mockReadContract.mockResolvedValueOnce(50_000_000n);

      const result = await getBtceShares({
        address: TEST_ADDRESS,
        chainId: ChainId.ethereum });

      expect(result).toEqual(BigNumber('0.5'));
    });

    it('returns zero for an address with no BTCe', async () => {
      mockReadContract.mockResolvedValueOnce(0n);

      const result = await getBtceShares({
        address: TEST_ADDRESS,
        chainId: ChainId.ethereum });

      expect(result).toEqual(BigNumber(0));
    });
  });

  describe('contract call arguments', () => {
    it('calls balanceOf on the BTCe contract address with the user address', async () => {
      mockReadContract.mockResolvedValueOnce(0n);

      await getBtceShares({
        address: TEST_ADDRESS,
        chainId: ChainId.ethereum });

      expect(mockReadContract).toHaveBeenCalledTimes(1);
      const callArgs = mockReadContract.mock.calls[0][0];

      expect(callArgs.functionName).toBe('balanceOf');
      expect(callArgs.address).toBe(BTCE_ADDRESS);
      expect(callArgs.args).toEqual([TEST_ADDRESS]);
    });
  });

  describe('chain support', () => {
    it.each([
      ['Ethereum', ChainId.ethereum],
      ['Base', ChainId.base],
      ['BSC', ChainId.binanceSmartChain],
    ] as const)('supports %s', async (_label, chainId) => {
      mockReadContract.mockResolvedValueOnce(0n);
      await expect(
        getBtceShares({ address: TEST_ADDRESS, chainId }),
      ).resolves.toBeInstanceOf(BigNumber);
    });

    it('throws for an unsupported chain (Corn)', async () => {
      await expect(
        getBtceShares({
          address: TEST_ADDRESS,
          chainId: ChainId.corn }),
      ).rejects.toThrow(/BTCe is not supported on chain/);
    });

    it('throws for a testnet chain', async () => {
      await expect(
        getBtceShares({
          address: TEST_ADDRESS,
          chainId: ChainId.sepolia }),
      ).rejects.toThrow(/BTCe is not supported on chain/);
    });
  });

  describe('input validation', () => {
    it('throws for an invalid address', async () => {
      await expect(
        getBtceShares({
          address: '0xnotanaddress',
          chainId: ChainId.ethereum }),
      ).rejects.toThrow(/Invalid address/);
    });

    it('throws for an empty string address', async () => {
      await expect(
        getBtceShares({
          address: '',
          chainId: ChainId.ethereum }),
      ).rejects.toThrow(/Invalid address/);
    });
  });

  describe('error propagation', () => {
    it('surfaces contract read errors with a descriptive message', async () => {
      mockReadContract.mockRejectedValueOnce(new Error('execution reverted'));

      await expect(
        getBtceShares({
          address: TEST_ADDRESS,
          chainId: ChainId.ethereum }),
      ).rejects.toThrow(/execution reverted/);
    });
  });
});
