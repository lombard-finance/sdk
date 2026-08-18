import BigNumber from 'bignumber.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { Token } from '../../../tokens/token-addresses';
import { getEarnMinimumDeposit } from '../../../vaults/lib/ops/get-vault-minimum-deposit';

// Mock the public client
const mockMulticall = vi.fn();
const mockReadContract = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn().mockReturnValue({
    multicall: (...args: unknown[]) => mockMulticall(...args),
    readContract: (...args: unknown[]) => mockReadContract(...args),
  }),
}));

// Mock getTokenInfo
vi.mock('../../../tokens/tokens', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getTokenInfo: vi.fn().mockResolvedValue({
      address: '0x8236a87084f8B84306f72007F36F2618A5634494',
      abi: [],
      symbol: 'LBTC',
      decimals: 8,
    }),
  };
});

// Realistic exchange rate: ~1.02 token per share (8 decimals)
const LBTC_RATE = 101997225n;
// Vault has 8 decimals, so 1 share = 10^8 base units
// Minimum: ceil(101997225 / 10^8) = 2 base units
const ONE_SHARE = 100000000n;

describe('getEarnMinimumDeposit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when 1 base unit yields shares', () => {
    it('should return 1 base unit as minimum', async () => {
      // Low exchange rate where 1 satoshi already produces shares
      mockMulticall.mockResolvedValueOnce([
        { status: 'success', result: 50000000n }, // rate: 0.5 per share
        { status: 'success', result: 2n }, // 1 sat → 2 shares
      ]);

      const result = await getEarnMinimumDeposit({
        token: Token.LBTC,
        chainId: ChainId.ethereum,
      });

      expect(result).toEqual(BigNumber('0.00000001')); // 1 satoshi
    });
  });

  describe('when 1 base unit yields 0 shares', () => {
    it('should calculate minimum from exchange rate', async () => {
      // Realistic rate: ~1.02 per share
      mockMulticall.mockResolvedValueOnce([
        { status: 'success', result: LBTC_RATE },
        { status: 'success', result: 0n }, // 1 sat → 0 shares
      ]);

      // ceil(101997225 / 100000000) = 2 sats
      // Verify: 2 * 10^8 / 101997225 = 1.96... → floor = 1 share ✓
      mockReadContract.mockResolvedValueOnce(1n);

      const result = await getEarnMinimumDeposit({
        token: Token.LBTC,
        chainId: ChainId.ethereum,
      });

      expect(result).toEqual(BigNumber('0.00000002')); // 2 satoshis
    });

    it('should handle rate that requires higher minimum', async () => {
      // Higher rate: 5.5 tokens per share
      const highRate = 550000000n;
      mockMulticall.mockResolvedValueOnce([
        { status: 'success', result: highRate },
        { status: 'success', result: 0n },
      ]);

      // ceil(550000000 / 100000000) = 6
      mockReadContract.mockResolvedValueOnce(1n);

      const result = await getEarnMinimumDeposit({
        token: Token.LBTC,
        chainId: ChainId.ethereum,
      });

      expect(result).toEqual(BigNumber('0.00000006')); // 6 satoshis
    });

    it('should increment if estimate yields 0 due to share premium', async () => {
      // Edge case: ceil division estimate is slightly too low
      mockMulticall.mockResolvedValueOnce([
        { status: 'success', result: 200000000n }, // rate: 2.0 per share
        { status: 'success', result: 0n },
      ]);

      // ceil(200000000 / 100000000) = 2, but due to premium, 2 → 0 shares
      mockReadContract.mockResolvedValueOnce(0n); // estimate = 2 yields 0

      // Fallback: batched multicall for candidates 3..12
      // First candidate (3) yields 1 share
      mockMulticall.mockResolvedValueOnce([
        { status: 'success', result: 1n }, // candidate 3 yields 1 share
        ...Array.from({ length: 9 }, () => ({
          status: 'success' as const,
          result: 0n,
        })),
      ]);

      const result = await getEarnMinimumDeposit({
        token: Token.LBTC,
        chainId: ChainId.ethereum,
      });

      expect(result).toEqual(BigNumber('0.00000003')); // 3 satoshis
    });
  });

  describe('contract call arguments', () => {
    it('should pass correct addresses to multicall', async () => {
      mockMulticall.mockResolvedValueOnce([
        { status: 'success', result: LBTC_RATE },
        { status: 'success', result: 0n },
      ]);
      mockReadContract.mockResolvedValueOnce(1n);

      await getEarnMinimumDeposit({
        token: Token.LBTC,
        chainId: ChainId.ethereum,
      });

      expect(mockMulticall).toHaveBeenCalledTimes(1);
      const multicallArgs = mockMulticall.mock.calls[0][0];

      // First contract call: getRateInQuote
      expect(multicallArgs.contracts[0].functionName).toBe('getRateInQuote');
      expect(multicallArgs.contracts[0].args).toEqual([
        '0x8236a87084f8B84306f72007F36F2618A5634494',
      ]);

      // Second contract call: previewDeposit with amount 1
      expect(multicallArgs.contracts[1].functionName).toBe('previewDeposit');
      expect(multicallArgs.contracts[1].args[1]).toBe(1n);
    });

    it('should verify estimate with readContract', async () => {
      mockMulticall.mockResolvedValueOnce([
        { status: 'success', result: LBTC_RATE },
        { status: 'success', result: 0n },
      ]);
      mockReadContract.mockResolvedValueOnce(1n);

      await getEarnMinimumDeposit({});

      expect(mockReadContract).toHaveBeenCalledTimes(1);
      const readArgs = mockReadContract.mock.calls[0][0];
      expect(readArgs.functionName).toBe('previewDeposit');
      // estimated min = ceil(101997225 / 100000000) = 2
      expect(readArgs.args[1]).toBe(2n);
    });
  });

  describe('default parameters', () => {
    it('should default token to LBTC and chain to Ethereum', async () => {
      mockMulticall.mockResolvedValueOnce([
        { status: 'success', result: LBTC_RATE },
        { status: 'success', result: 0n },
      ]);
      mockReadContract.mockResolvedValueOnce(1n);

      const result = await getEarnMinimumDeposit({});

      expect(result).toEqual(BigNumber('0.00000002'));
    });
  });

  describe('error handling', () => {
    it('should throw for unsupported chain', async () => {
      await expect(
        getEarnMinimumDeposit({
          chainId: ChainId.sepolia,
        }),
      ).rejects.toThrow(/Unsupported chain id/);
    });

    it('should throw for unsupported token/chain combination', async () => {
      // eBTC is only supported on Ethereum, not Base
      await expect(
        getEarnMinimumDeposit({
          token: Token.eBTC,
          chainId: ChainId.base,
        }),
      ).rejects.toThrow(/not supported on chain/);
    });

    it('should throw when getRateInQuote fails', async () => {
      mockMulticall.mockResolvedValueOnce([
        { status: 'failure', error: new Error('Rate not available') },
        { status: 'success', result: 0n },
      ]);

      await expect(getEarnMinimumDeposit({})).rejects.toThrow(
        /Failed to get exchange rate/,
      );
    });

    it('should throw when previewDeposit fails', async () => {
      mockMulticall.mockResolvedValueOnce([
        { status: 'success', result: LBTC_RATE },
        { status: 'failure', error: new Error('Preview failed') },
      ]);

      await expect(getEarnMinimumDeposit({})).rejects.toThrow(
        /Failed to preview deposit/,
      );
    });

    it('should throw after max attempts if no minimum found', async () => {
      mockMulticall.mockResolvedValueOnce([
        { status: 'success', result: LBTC_RATE },
        { status: 'success', result: 0n },
      ]);

      // Verify call returns 0
      mockReadContract.mockResolvedValueOnce(0n);

      // Fallback batch: all candidates return 0 shares
      mockMulticall.mockResolvedValueOnce(
        Array.from({ length: 10 }, () => ({
          status: 'success' as const,
          result: 0n,
        })),
      );

      await expect(getEarnMinimumDeposit({})).rejects.toThrow(
        /Could not determine minimum deposit amount/,
      );
    });
  });

  describe('cross-chain support', () => {
    it('should resolve Ethereum token address for cross-chain queries', async () => {
      const { getTokenInfo } = await import('../../../tokens/tokens');

      mockMulticall.mockResolvedValueOnce([
        { status: 'success', result: LBTC_RATE },
        { status: 'success', result: 0n },
      ]);
      mockReadContract.mockResolvedValueOnce(1n);

      await getEarnMinimumDeposit({
        token: Token.LBTC,
        chainId: ChainId.base,
      });

      // Should call getTokenInfo with Ethereum chainId (for Lens query).
      // The trailing argument is the resolved Ethereum RPC URL, undefined here
      // because neither `rpcUrls` nor an Ethereum active chain supplied one.
      expect(getTokenInfo).toHaveBeenCalledWith(
        Token.LBTC,
        ChainId.ethereum,
        undefined,
        undefined,
      );
    });
  });

  describe('mathematical correctness', () => {
    it.each([
      {
        rate: ONE_SHARE, // 1.0 per share
        expectedMin: '0.00000001', // 1 sat: ceil(1e8/1e8) = 1
        desc: 'rate exactly 1.0',
      },
      {
        rate: ONE_SHARE + 1n, // 1.00000001 per share
        expectedMin: '0.00000002', // ceil(100000001/100000000) = 2
        desc: 'rate just above 1.0',
      },
      {
        rate: 2n * ONE_SHARE, // 2.0 per share
        expectedMin: '0.00000002', // ceil(200000000/100000000) = 2
        desc: 'rate exactly 2.0',
      },
      {
        rate: 10n * ONE_SHARE, // 10.0 per share
        expectedMin: '0.0000001', // ceil(1000000000/100000000) = 10
        desc: 'rate exactly 10.0',
      },
    ])(
      'should calculate correct minimum for $desc',
      async ({ rate, expectedMin }) => {
        const previewResult =
          rate <= ONE_SHARE
            ? 1n // 1 sat yields at least 1 share
            : 0n;

        mockMulticall.mockResolvedValueOnce([
          { status: 'success', result: rate },
          { status: 'success', result: previewResult },
        ]);

        if (previewResult === 0n) {
          mockReadContract.mockResolvedValueOnce(1n);
        }

        const result = await getEarnMinimumDeposit({});
        expect(result).toEqual(BigNumber(expectedMin));
      },
    );
  });
});
