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

import { makePublicClient } from '../../../clients/public-client';
import { rpcUrlConfig } from '../../../clients/rpc-url-config';
import { getMintingFee } from '../../../contract-functions/getLBTCMintingFee/getLBTCMintingFee';

const CUSTOM_ETH_RPC = 'https://eth.example-partner.invalid';
const CUSTOM_BASE_RPC = 'https://base.example-partner.invalid';

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
    it('uses the configured RPC for the requested chain', async () => {
      vi.mocked(getMintingFee).mockResolvedValue(new BigNumber('0.00001992'));

      const registry = new CapabilityRegistry([evmModule()], {
        env: Env.prod,
        providers: {},
        modules: [],
        rpcUrls,
      });

      const evm = registry.require('evm') as EvmService;
      await evm.getMintingFee(ChainId.ethereum);

      expect(getMintingFee).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: ChainId.ethereum,
          rpcUrl: CUSTOM_ETH_RPC,
        }),
      );
    });

    it('falls back to the public default for a chain that is not configured', async () => {
      vi.mocked(getMintingFee).mockResolvedValue(new BigNumber('0.00001992'));

      const registry = new CapabilityRegistry([evmModule()], {
        env: Env.prod,
        providers: {},
        modules: [],
        rpcUrls,
      });

      const evm = registry.require('evm') as EvmService;
      await evm.getMintingFee(ChainId.sonic);

      // Asserted positionally rather than with objectContaining: a missing
      // `rpcUrl` key and an explicit `undefined` are indistinguishable there,
      // so the assertion would survive the threading being removed entirely.
      const [args] = vi.mocked(getMintingFee).mock.calls[0];
      expect(args.chainId).toBe(ChainId.sonic);
      expect(args.rpcUrl).toBeUndefined();
    });
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
