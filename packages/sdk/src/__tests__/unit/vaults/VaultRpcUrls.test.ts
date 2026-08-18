/**
 * The Earn vault's Lens and Accountant contracts live on Ethereum only, so
 * `previewEarnDeposit` and `getEarnMinimumDeposit` always read Ethereum even
 * when the deposit originates elsewhere. The single `rpcUrl` parameter belongs
 * to the active chain and must not be pointed at Ethereum from another chain;
 * the per-chain `rpcUrls` map can be, and these tests pin both behaviours.
 *
 * @module __tests__/unit/vaults/VaultRpcUrls.test.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { Token } from '../../../tokens/token-addresses';
import { getEarnMinimumDeposit } from '../../../vaults/lib/ops/get-vault-minimum-deposit';
import { previewEarnDeposit } from '../../../vaults/lib/ops/preview-vault-deposit';

const mockReadContract = vi.fn();
const mockMulticall = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn().mockReturnValue({
    readContract: (...args: unknown[]) => mockReadContract(...args),
    multicall: (...args: unknown[]) => mockMulticall(...args),
  }),
}));

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

import { makePublicClient } from '../../../clients/public-client';
import { getTokenInfo } from '../../../tokens/tokens';

const ETH_RPC = 'https://eth.example-partner.invalid';
const BASE_RPC = 'https://base.example-partner.invalid';

/** The endpoint the Ethereum read client was actually built with. */
function ethClientRpcUrl(): string | undefined {
  const [args] = vi.mocked(makePublicClient).mock.calls[0] as [
    { chainId: number; rpcUrl?: string },
  ];
  expect(args.chainId).toBe(ChainId.ethereum);
  return args.rpcUrl;
}

/** The endpoint the Ethereum token lookup was given. */
function tokenLookupRpcUrl(): string | undefined {
  const call = vi.mocked(getTokenInfo).mock.calls[0];
  expect(call[1]).toBe(ChainId.ethereum);
  return call[3];
}

describe('Earn vault Ethereum-only reads honor rpcUrls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadContract.mockResolvedValue(98039n);
    mockMulticall.mockResolvedValue([
      { status: 'success', result: 1020000n },
      { status: 'success', result: 1n },
    ]);
  });

  describe('previewEarnDeposit', () => {
    it('uses the Ethereum entry of rpcUrls when depositing from another chain', async () => {
      await previewEarnDeposit({
        amount: '0.001',
        token: Token.LBTC,
        chainId: ChainId.base,
        rpcUrls: { [ChainId.ethereum]: ETH_RPC, [ChainId.base]: BASE_RPC },
      });

      expect(ethClientRpcUrl()).toBe(ETH_RPC);
      expect(tokenLookupRpcUrl()).toBe(ETH_RPC);
    });

    it('uses the Ethereum entry of rpcUrls when depositing from Ethereum', async () => {
      await previewEarnDeposit({
        amount: '0.001',
        token: Token.LBTC,
        chainId: ChainId.ethereum,
        rpcUrls: { [ChainId.ethereum]: ETH_RPC },
      });

      expect(ethClientRpcUrl()).toBe(ETH_RPC);
    });

    it('never sends the active chain rpcUrl to the Ethereum read', async () => {
      await previewEarnDeposit({
        amount: '0.001',
        token: Token.LBTC,
        chainId: ChainId.base,
        rpcUrl: BASE_RPC,
      });

      // A Base endpoint cannot serve an Ethereum read, so the client falls
      // back to the public default rather than reusing it.
      expect(ethClientRpcUrl()).toBeUndefined();
      expect(tokenLookupRpcUrl()).toBeUndefined();
    });

    it('still accepts the single rpcUrl when the active chain is Ethereum', async () => {
      await previewEarnDeposit({
        amount: '0.001',
        token: Token.LBTC,
        chainId: ChainId.ethereum,
        rpcUrl: ETH_RPC,
      });

      expect(ethClientRpcUrl()).toBe(ETH_RPC);
    });
  });

  describe('getEarnMinimumDeposit', () => {
    it('uses the Ethereum entry of rpcUrls when depositing from another chain', async () => {
      await getEarnMinimumDeposit({
        token: Token.LBTC,
        chainId: ChainId.base,
        rpcUrls: { [ChainId.ethereum]: ETH_RPC, [ChainId.base]: BASE_RPC },
      });

      expect(ethClientRpcUrl()).toBe(ETH_RPC);
      expect(tokenLookupRpcUrl()).toBe(ETH_RPC);
    });

    it('never sends the active chain rpcUrl to the Ethereum read', async () => {
      await getEarnMinimumDeposit({
        token: Token.LBTC,
        chainId: ChainId.base,
        rpcUrl: BASE_RPC,
      });

      expect(ethClientRpcUrl()).toBeUndefined();
      expect(tokenLookupRpcUrl()).toBeUndefined();
    });

    it('still accepts the single rpcUrl when the active chain is Ethereum', async () => {
      await getEarnMinimumDeposit({
        token: Token.LBTC,
        chainId: ChainId.ethereum,
        rpcUrl: ETH_RPC,
      });

      expect(ethClientRpcUrl()).toBe(ETH_RPC);
    });
  });
});
