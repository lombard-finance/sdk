import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { wrapToBtce } from '../../../contract-functions/wrapToBtce/wrapToBtce';

const mockSimulateContract = vi.fn();
const mockWriteContract = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    simulateContract: (...args: unknown[]) => mockSimulateContract(...args),
  })),
}));

vi.mock('../../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({
    writeContract: (...args: unknown[]) => mockWriteContract(...args),
  })),
}));

const ACCOUNT = '0x000000000000000000000000000000000000dEaD';
const RECEIVER = '0x000000000000000000000000000000000000bEEf';
const LBTCV_ADDR = '0x5401b8620E5FB570064CA9114fd1e135fd77D57c';
const BTCE_ADDR = '0x3a4baaBf4DC9910596821615e848f0e6545762F3';
const PROVIDER = {
  request: vi.fn(),
} as unknown as Parameters<typeof wrapToBtce>[0]['provider'];

describe('wrapToBtce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSimulateContract.mockResolvedValue({
      request: { address: BTCE_ADDR, abi: [], functionName: 'deposit' },
    });
    mockWriteContract.mockResolvedValue('0xtxhash');
  });

  describe('happy path', () => {
    it('calls deposit(token, assetsBase, receiver, minMintBase) on the BTCe contract', async () => {
      await wrapToBtce({
        tokenAddress: LBTCV_ADDR,
        amount: '0.5',
        tokenDecimals: 8,
        receiver: RECEIVER,
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      expect(mockSimulateContract).toHaveBeenCalledTimes(1);
      const call = mockSimulateContract.mock.calls[0][0];
      expect(call.functionName).toBe('deposit');
      expect(call.address).toBe(BTCE_ADDR);
      expect(call.account).toBe(ACCOUNT);
      // 4-arg multi-asset deposit: [token, assets, receiver, minMint]
      expect(call.args[0]).toBe(LBTCV_ADDR);
      expect(call.args[1]).toBe(50_000_000n); // 0.5 LBTCv at 8 decimals
      expect(call.args[2]).toBe(RECEIVER);
      expect(call.args[3]).toBe(0n); // default minMint
    });

    it('returns the transaction hash from writeContract', async () => {
      mockWriteContract.mockResolvedValueOnce('0xdeadbeef');

      const hash = await wrapToBtce({
        tokenAddress: LBTCV_ADDR,
        amount: '1',
        tokenDecimals: 8,
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      expect(hash).toBe('0xdeadbeef');
    });

    it('defaults receiver to account when not provided', async () => {
      await wrapToBtce({
        tokenAddress: LBTCV_ADDR,
        amount: '0.1',
        tokenDecimals: 8,
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      const call = mockSimulateContract.mock.calls[0][0];
      expect(call.args[2]).toBe(ACCOUNT);
    });

    it('forwards minimumMint as a base-denomination bigint', async () => {
      await wrapToBtce({
        tokenAddress: LBTCV_ADDR,
        amount: '1',
        tokenDecimals: 8,
        minimumMint: '0.95',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      const call = mockSimulateContract.mock.calls[0][0];
      // minMint is denominated in BTCe shares which match 8 decimals
      expect(call.args[3]).toBe(95_000_000n);
    });
  });

  describe('multi-decimal tokens', () => {
    it('converts to base units using the supplied tokenDecimals', async () => {
      // wBTC has 8 decimals (same as LBTC) but contracts may vary; verify the
      // shift is driven by tokenDecimals not a hardcoded constant.
      await wrapToBtce({
        tokenAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        amount: '0.01',
        tokenDecimals: 18, // pretend 18 to prove the conversion uses the param
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      const call = mockSimulateContract.mock.calls[0][0];
      expect(call.args[1]).toBe(10_000_000_000_000_000n); // 0.01 * 10^18
    });
  });

  describe('chain support', () => {
    it.each([
      ['Ethereum', ChainId.ethereum],
      ['Base', ChainId.base],
      ['BSC', ChainId.binanceSmartChain],
    ] as const)('supports %s', async (_label, chainId) => {
      await expect(
        wrapToBtce({
          tokenAddress: LBTCV_ADDR,
          amount: '0.01',
          tokenDecimals: 8,
          account: ACCOUNT,
          chainId,
          provider: PROVIDER,
        }),
      ).resolves.toBe('0xtxhash');
    });

    it('throws on an unsupported chain (non-BTCe chain)', async () => {
      await expect(
        wrapToBtce({
          tokenAddress: LBTCV_ADDR,
          amount: '0.1',
          tokenDecimals: 8,
          account: ACCOUNT,
          chainId: ChainId.katana,
          provider: PROVIDER,
        }),
      ).rejects.toThrow(/BTCe is not supported on chain/);
    });
  });

  describe('input validation', () => {
    it('throws for zero amount', async () => {
      await expect(
        wrapToBtce({
          tokenAddress: LBTCV_ADDR,
          amount: '0',
          tokenDecimals: 8,
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER,
        }),
      ).rejects.toThrow(/must be greater than zero/);
    });

    it('throws for negative amount', async () => {
      await expect(
        wrapToBtce({
          tokenAddress: LBTCV_ADDR,
          amount: '-0.1',
          tokenDecimals: 8,
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER,
        }),
      ).rejects.toThrow(/must be greater than zero/);
    });

    it('throws for invalid token address', async () => {
      await expect(
        wrapToBtce({
          tokenAddress: '0xnotanaddress' as `0x${string}`,
          amount: '0.1',
          tokenDecimals: 8,
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER,
        }),
      ).rejects.toThrow(/Invalid token address/);
    });
  });

  describe('error propagation', () => {
    it('surfaces simulateContract reverts to the caller', async () => {
      mockSimulateContract.mockRejectedValueOnce(
        new Error('execution reverted: MinimumMintNotMet'),
      );

      await expect(
        wrapToBtce({
          tokenAddress: LBTCV_ADDR,
          amount: '0.1',
          tokenDecimals: 8,
          minimumMint: '999',
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER,
        }),
      ).rejects.toThrow(/MinimumMintNotMet/);
    });
  });
});
