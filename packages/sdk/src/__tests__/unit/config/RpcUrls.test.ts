/**
 * Covers the `rpcUrls` config option end to end: the value a consumer passes to
 * `createLombardSDK({ rpcUrls })` has to survive validation, reach every context
 * an action reads from, and win over the public default when a read client is
 * built. A break anywhere along that chain silently routes reads to the public
 * RPCs, which is exactly what the option exists to avoid.
 */

import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { validateAndApplyDefaults } from '../../../config/validation';
import { apiModule } from '../../../modules/apiModule';
import { btcModule } from '../../../modules/btcModule';
import { CapabilityRegistry } from '../../../modules/CapabilityRegistry';
import { evmModule } from '../../../modules/evmModule';
import type { EvmService } from '../../../services/EvmService';
import {
  createBtcCoreContext,
  createEvmCoreContext,
} from '../../../shared/context/ContextBuilder';

vi.mock(
  '../../../contract-functions/getLBTCMintingFee/getLBTCMintingFee',
  () => ({
    getMintingFee: vi.fn(),
  }),
);

vi.mock('../../../contract-functions/signNetworkFee/signNetworkFee', () => ({
  signNetworkFee: vi.fn(),
}));

vi.mock(
  '../../../contract-functions/getStakeAndBakeFee/getStakeAndBakeFee',
  () => ({
    getStakeAndBakeFee: vi.fn(),
  }),
);

vi.mock(
  '../../../contract-functions/signStakeAndBake/signStakeAndBake',
  () => ({
    signStakeAndBake: vi.fn(),
  }),
);

import { makePublicClient } from '../../../clients/public-client';
import { rpcUrlConfig } from '../../../clients/rpc-url-config';
import { getMintingFee } from '../../../contract-functions/getLBTCMintingFee/getLBTCMintingFee';
import { getStakeAndBakeFee } from '../../../contract-functions/getStakeAndBakeFee/getStakeAndBakeFee';
import { signNetworkFee } from '../../../contract-functions/signNetworkFee/signNetworkFee';
import { signStakeAndBake } from '../../../contract-functions/signStakeAndBake/signStakeAndBake';

const CUSTOM_ETH_RPC = 'https://eth.example-partner.invalid';
const CUSTOM_BASE_RPC = 'https://base.example-partner.invalid';
const ACCOUNT = '0x0000000000000000000000000000000000000002';

const rpcUrls = {
  [ChainId.ethereum]: CUSTOM_ETH_RPC,
  [ChainId.base]: CUSTOM_BASE_RPC,
};

describe('rpcUrls config option', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validation', () => {
    it('carries rpcUrls through to the normalized config', () => {
      const normalized = validateAndApplyDefaults({
        env: Env.prod,
        providers: {},
        rpcUrls,
      });

      expect(normalized.rpcUrls).toEqual(rpcUrls);
    });

    it('leaves rpcUrls undefined when the consumer omits it', () => {
      const normalized = validateAndApplyDefaults({
        env: Env.prod,
        providers: {},
      });

      expect(normalized.rpcUrls).toBeUndefined();
    });
  });

  describe('context propagation', () => {
    it('exposes rpcUrls on the EVM core context', () => {
      const ctx = createEvmCoreContext({
        env: Env.prod,
        providers: {},
        modules: [evmModule()],
        rpcUrls,
      });

      expect(ctx.rpcUrls).toEqual(rpcUrls);
    });

    it('exposes rpcUrls on the BTC core context', () => {
      const ctx = createBtcCoreContext({
        env: Env.prod,
        providers: {},
        modules: [btcModule(), apiModule()],
        rpcUrls,
      });

      expect(ctx.rpcUrls).toEqual(rpcUrls);
    });

    it('forwards rpcUrls to modules via the register context', () => {
      const register = vi.fn().mockReturnValue('service-instance');
      const registry = new CapabilityRegistry([{ id: 'probe', register }], {
        env: Env.prod,
        providers: {},
        modules: [],
        rpcUrls,
      });

      registry.require('probe');

      expect(register).toHaveBeenCalledWith(
        expect.objectContaining({ rpcUrls }),
      );
    });
  });

  describe('EvmService reads', () => {
    function makeService(): EvmService {
      const registry = new CapabilityRegistry([evmModule()], {
        env: Env.prod,
        providers: {},
        modules: [],
        rpcUrls,
      });

      return registry.require('evm') as EvmService;
    }

    const SIGNATURE = {
      signature: '0xabc123' as `0x${string}`,
      typedData: '{}',
    };

    // Every public method resolves its endpoint through the same private
    // helper, but each one has to pass the result along by hand, so they are
    // exercised individually rather than through the helper.
    const methods = [
      {
        name: 'getMintingFee',
        mock: getMintingFee,
        arrange: () =>
          vi.mocked(getMintingFee).mockResolvedValue(new BigNumber('0.0001')),
        call: (evm: EvmService, chainId: number) =>
          evm.getMintingFee(chainId as never),
      },
      {
        name: 'signNetworkFee',
        mock: signNetworkFee,
        arrange: () => vi.mocked(signNetworkFee).mockResolvedValue(SIGNATURE),
        call: (evm: EvmService, chainId: number) =>
          evm.signNetworkFee({
            fee: '32',
            account: ACCOUNT,
            chainId: chainId as never,
            provider: {} as never,
          }),
      },
      {
        name: 'getStakeAndBakeFee',
        mock: getStakeAndBakeFee,
        arrange: () =>
          vi
            .mocked(getStakeAndBakeFee)
            .mockResolvedValue(new BigNumber('0.0001')),
        call: (evm: EvmService, chainId: number) =>
          evm.getStakeAndBakeFee(chainId as never, 'veda' as never),
      },
      {
        name: 'signStakeAndBake',
        mock: signStakeAndBake,
        arrange: () =>
          vi
            .mocked(signStakeAndBake)
            .mockResolvedValue({ ...SIGNATURE, mode: 'permit' as never }),
        call: (evm: EvmService, chainId: number) =>
          evm.signStakeAndBake({
            value: '1',
            account: ACCOUNT,
            chainId: chainId as never,
            provider: {} as never,
            vaultKey: 'veda' as never,
            token: 'LBTC' as never,
          }),
      },
    ];

    for (const { name, mock, arrange, call } of methods) {
      it(`${name} forwards the configured RPC for the requested chain`, async () => {
        arrange();

        await call(makeService(), ChainId.ethereum);

        const [args] = vi.mocked(mock).mock.calls[0] as [
          { chainId: number; rpcUrl?: string },
        ];
        expect(args.chainId).toBe(ChainId.ethereum);
        expect(args.rpcUrl).toBe(CUSTOM_ETH_RPC);
      });

      it(`${name} leaves rpcUrl unset for a chain that is not configured`, async () => {
        arrange();

        await call(makeService(), ChainId.sonic);

        // Asserted positionally rather than with objectContaining: a missing
        // `rpcUrl` key and an explicit `undefined` are indistinguishable
        // there, so the assertion would survive the threading being removed.
        const [args] = vi.mocked(mock).mock.calls[0] as [
          { chainId: number; rpcUrl?: string },
        ];
        expect(args.chainId).toBe(ChainId.sonic);
        expect(args.rpcUrl).toBeUndefined();
      });
    }
  });

  describe('makePublicClient', () => {
    it('prefers the per-call override over the public default', () => {
      const client = makePublicClient({
        chainId: ChainId.ethereum,
        rpcUrl: CUSTOM_ETH_RPC,
      });

      expect(client.transport.url).toBe(CUSTOM_ETH_RPC);
    });

    it('uses the public default when no override is given', () => {
      const client = makePublicClient({ chainId: ChainId.ethereum });

      expect(client.transport.url).toBe(rpcUrlConfig[ChainId.ethereum]);
    });
  });
});
