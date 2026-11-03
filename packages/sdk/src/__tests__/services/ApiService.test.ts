import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateDepositBtcAddress } from '../../api-functions/generateDepositBtcAddress/generateDepositBtcAddress';
import { getNetworkFeeSignature } from '../../api-functions/getNetworkFeeSignature/getNetworkFeeSignature';
import { storeNetworkFeeSignature } from '../../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature';
import { storeStakeAndBakeSignature } from '../../api-functions/storeStakeAndBakeSignature/storeStakeAndBakeSignature';
import { ChainId } from '../../common/chains';
import { apiModule } from '../../modules/apiModule';
import { CapabilityRegistry } from '../../modules/CapabilityRegistry';
import { ApiService } from '../../services/ApiService';

// Mock dependencies
vi.mock(
  '../../api-functions/generateDepositBtcAddress/generateDepositBtcAddress',
  () => ({
    generateDepositBtcAddress: vi.fn().mockResolvedValue('tb1qmockaddress'),
  }),
);
vi.mock(
  '../../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature',
  () => ({
    storeNetworkFeeSignature: vi.fn(),
  }),
);
vi.mock(
  '../../api-functions/getNetworkFeeSignature/getNetworkFeeSignature',
  () => ({
    getNetworkFeeSignature: vi.fn(),
  }),
);
vi.mock(
  '../../api-functions/storeStakeAndBakeSignature/storeStakeAndBakeSignature',
  () => ({
    storeStakeAndBakeSignature: vi.fn(),
  }),
);

describe('ApiService', () => {
  let service: ApiService;

  beforeEach(() => {
    service = new ApiService(Env.testnet);
    vi.clearAllMocks();
  });

  describe('generateDepositAddress', () => {
    it('should forward captchaToken to generateDepositBtcAddress', async () => {
      await service.generateDepositAddress({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chainId: ChainId.sepolia,
        signature: '0xsig',
        token: 'LBTC',
        captchaToken: 'test-captcha-token',
      });

      expect(generateDepositBtcAddress).toHaveBeenCalledWith(
        expect.objectContaining({ captchaToken: 'test-captcha-token' }),
      );
    });

    it('should work without captchaToken', async () => {
      await service.generateDepositAddress({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chainId: ChainId.sepolia,
        signature: '0xsig',
        token: 'LBTC',
      });

      expect(generateDepositBtcAddress).toHaveBeenCalledWith(
        expect.objectContaining({ captchaToken: undefined }),
      );
    });
  });

  describe('Fee Signatures', () => {
    it('should store fee signature', async () => {
      // ApiService.storeFeeSignature expects typedData as a string payload (serialized)
      const typedData = JSON.stringify({ domain: {} });

      await service.storeFeeSignature({
        address: '0x123',
        signature: '0xsig',
        typedData,
      });

      expect(storeNetworkFeeSignature).toHaveBeenCalledWith({
        address: '0x123',
        signature: '0xsig',
        typedData,
        env: Env.testnet,
      });
    });

    it('should retrieve fee signature', async () => {
      vi.mocked(getNetworkFeeSignature).mockResolvedValue({
        hasSignature: true,
        signature: '0xsig',
        expirationDate: '2025-01-01',
        isDelayed: false,
      });

      const result = await service.getFeeSignature({
        address: '0x123',
        chainId: ChainId.sepolia,
      });

      expect(result.hasSignature).toBe(true);
      expect(result.signature).toBe('0xsig');
    });
  });

  /**
   * The fee approval and permit routes are user-scoped, so the service has to
   * carry the caller's way of getting a token into every one of those calls.
   */
  describe('wallet auth on the user-scoped calls', () => {
    const auth = { getToken: async () => 'jwt' };
    const getAuthToken = () => 'sync-jwt';

    beforeEach(() => {
      service = new ApiService(Env.testnet, { auth, getAuthToken });
      vi.mocked(getNetworkFeeSignature).mockResolvedValue({
        hasSignature: false,
        expirationDate: '',
        isDelayed: false,
      });
    });

    it('forwards it when storing a fee approval', async () => {
      await service.storeFeeSignature({
        address: '0x123',
        signature: '0xsig',
        typedData: '{}',
      });

      expect(storeNetworkFeeSignature).toHaveBeenCalledWith(
        expect.objectContaining({ auth, getAuthToken }),
      );
    });

    it('forwards it when reading a fee approval', async () => {
      await service.getFeeSignature({
        address: '0x123',
        chainId: ChainId.sepolia,
      });

      expect(getNetworkFeeSignature).toHaveBeenCalledWith(
        expect.objectContaining({ auth, getAuthToken }),
      );
    });

    it('forwards it when storing a stake-and-bake permit', async () => {
      await service.storeStakeAndBakeSignature({
        signature: '0xsig',
        typedData: '{}',
      });

      expect(storeStakeAndBakeSignature).toHaveBeenCalledWith(
        expect.objectContaining({ auth, getAuthToken }),
      );
    });

    it('does not add it to the deposit-address calls', async () => {
      await service.generateDepositAddress({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chainId: ChainId.sepolia,
        signature: '0xsig',
        token: 'LBTC',
      });

      expect(
        vi.mocked(generateDepositBtcAddress).mock.calls[0]?.[0],
      ).not.toHaveProperty('auth');
    });

    // The SDK builds the service through the module, from the config.
    it('gets it from the config through apiModule', async () => {
      const registry = new CapabilityRegistry([apiModule()], {
        env: Env.testnet,
        providers: {},
        modules: [],
        auth,
      });
      const fromModule = registry.require('api') as ApiService;

      await fromModule.getFeeSignature({
        address: '0x123',
        chainId: ChainId.sepolia,
      });

      expect(getNetworkFeeSignature).toHaveBeenCalledWith(
        expect.objectContaining({ env: Env.testnet, auth }),
      );
    });
  });
});
