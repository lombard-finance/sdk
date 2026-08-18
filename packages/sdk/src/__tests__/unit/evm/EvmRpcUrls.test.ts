/**
 * Covers the EVM read paths that reach a public client through a helper rather
 * than through `makePublicClient` directly. Each of these forwards the chain's
 * configured RPC by hand, so a dropped argument is invisible at the type level:
 * the parameter is optional everywhere, and the read silently falls back to the
 * public default instead of the endpoint the consumer configured.
 *
 * @module __tests__/unit/evm/EvmRpcUrls.test.ts
 */

import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EvmStake } from '../../../chains/evm/actions/stake/EvmStake';
import { EvmCancelWithdraw } from '../../../chains/evm/actions/withdraw/EvmCancelWithdraw';
import {
  authorizeFee,
  checkFeeAuthorization,
} from '../../../chains/evm/shared/feeAuth';
import { PartnerConfiguration } from '../../../client/PartnerConfiguration';
import { ChainId } from '../../../common/chains';
import { AssetId, Chain } from '../../../core';
import type { EvmCoreContext } from '../../../shared/context/types';
import { Token } from '../../../tokens/token-addresses';

vi.mock('../../../tokens/tokens', () => ({
  getTokenContractInfo: vi.fn().mockResolvedValue({
    address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    abi: [],
  }),
}));

vi.mock('../../../contract-functions/approveToken', () => ({
  getTokenAllowance: vi.fn().mockResolvedValue(new BigNumber('1000')),
  approveToken: vi.fn().mockResolvedValue('0xtxhash'),
}));

vi.mock('../../../vaults/lib/ops/withdraw', () => ({
  cancelWithdrawInternal: vi.fn().mockResolvedValue('0xcancelhash'),
}));

vi.mock('../../../api-functions', () => ({
  getNetworkFeeSignature: vi.fn().mockResolvedValue({
    hasSignature: false,
    expirationDate: null,
  }),
}));

vi.mock(
  '../../../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature',
  () => ({ storeNetworkFeeSignature: vi.fn().mockResolvedValue(undefined) }),
);

vi.mock('../../../contract-functions', () => ({
  getMintingFee: vi.fn().mockResolvedValue(new BigNumber('0.00000032')),
}));

vi.mock('../../../contract-functions/signNetworkFee/signNetworkFee', () => ({
  signNetworkFee: vi.fn().mockResolvedValue({
    signature: '0xabc123' as `0x${string}`,
    typedData: '{}',
  }),
}));

import { getTokenAllowance } from '../../../contract-functions/approveToken';
import { getTokenContractInfo } from '../../../tokens/tokens';
import { cancelWithdrawInternal } from '../../../vaults/lib/ops/withdraw';

const AVALANCHE_RPC = 'https://avalanche.example-partner.invalid';
const ETHEREUM_RPC = 'https://eth.example-partner.invalid';

const ACCOUNT = '0x0000000000000000000000000000000000000002' as `0x${string}`;

const mockProvider = {
  request: vi.fn(async ({ method }: { method: string }) => {
    if (method === 'eth_accounts') {
      return [ACCOUNT];
    }
    return [];
  }),
};

function createContext(rpcUrls?: Record<number, string>): EvmCoreContext {
  return {
    env: Env.prod,
    partner: new PartnerConfiguration(undefined),
    getProvider: async () => mockProvider,
    evm: {} as EvmCoreContext['evm'],
    rpcUrls,
  };
}

describe('EVM actions honor configured rpcUrls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('EvmStake allowance read', () => {
    it('passes the configured RPC to getTokenAllowance', async () => {
      const ctx = createContext({ [ChainId.avalanche]: AVALANCHE_RPC });
      const stake = new EvmStake(ctx, {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.AVALANCHE,
      });

      await stake.prepare({ amount: '0.5' });

      const [args] = vi.mocked(getTokenAllowance).mock.calls[0];
      expect(args.chainId).toBe(ChainId.avalanche);
      expect(args.rpcUrl).toBe(AVALANCHE_RPC);
    });

    it('leaves rpcUrl undefined when the chain is not configured', async () => {
      const ctx = createContext({ [ChainId.ethereum]: ETHEREUM_RPC });
      const stake = new EvmStake(ctx, {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.AVALANCHE,
      });

      await stake.prepare({ amount: '0.5' });

      const [args] = vi.mocked(getTokenAllowance).mock.calls[0];
      expect(args.rpcUrl).toBeUndefined();
    });
  });

  describe('EvmCancelWithdraw', () => {
    it('passes the configured RPC to cancelWithdrawInternal', async () => {
      const ctx = createContext({ [ChainId.ethereum]: ETHEREUM_RPC });
      const cancel = new EvmCancelWithdraw(ctx, {
        chain: Chain.ETHEREUM,
        protocol: 'veda',
      });

      await cancel.prepare();
      await cancel.execute();

      const [args] = vi.mocked(cancelWithdrawInternal).mock.calls[0];
      expect(args.chainId).toBe(ChainId.ethereum);
      expect(args.rpcUrl).toBe(ETHEREUM_RPC);
    });
  });

  describe('fee authorization', () => {
    it('passes the RPC to the token lookup in checkFeeAuthorization', async () => {
      await checkFeeAuthorization(
        ChainId.ethereum,
        ACCOUNT,
        Env.prod,
        Token.LBTC,
        ETHEREUM_RPC,
      );

      // `getTokenContractInfo` resolves the LBTC ABI by probing the contract
      // on-chain, so it needs the RPC as much as the fee read that follows it.
      const call = vi.mocked(getTokenContractInfo).mock.calls[0];
      expect(call[1]).toBe(ChainId.ethereum);
      expect(call[4]).toBe(ETHEREUM_RPC);
    });

    it('passes the RPC to the token lookup in authorizeFee', async () => {
      await authorizeFee({
        chainId: ChainId.ethereum,
        account: ACCOUNT,
        feeInSatoshis: BigInt(32),
        provider: mockProvider as never,
        env: Env.prod,
        token: Token.LBTC,
        rpcUrl: ETHEREUM_RPC,
      });

      const call = vi.mocked(getTokenContractInfo).mock.calls[0];
      expect(call[4]).toBe(ETHEREUM_RPC);
    });
  });
});
