import { Env } from '@lombard.finance/sdk-common';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import { generateDepositBtcAddress } from '../../api-functions/generateDepositBtcAddress/generateDepositBtcAddress';
import { getNetworkFeeSignature } from '../../api-functions/getNetworkFeeSignature/getNetworkFeeSignature';
import { storeNetworkFeeSignature } from '../../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature';
import { ChainId } from '../../common/chains';
import { ApiService } from '../../services/ApiService';

// Mock dependencies
vi.mock('../../api-functions/generateDepositBtcAddress/generateDepositBtcAddress', () => ({
  generateDepositBtcAddress: vi.fn().mockResolvedValue('tb1qmockaddress') }));
vi.mock('../../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature', () => ({
  storeNetworkFeeSignature: vi.fn() }));
vi.mock('../../api-functions/getNetworkFeeSignature/getNetworkFeeSignature', () => ({
  getNetworkFeeSignature: vi.fn() }));

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
        captchaToken: 'test-captcha-token' });

      expect(generateDepositBtcAddress).toHaveBeenCalledWith(
        expect.objectContaining({ captchaToken: 'test-captcha-token' }),
      );
    });

    it('should work without captchaToken', async () => {
      await service.generateDepositAddress({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chainId: ChainId.sepolia,
        signature: '0xsig',
        token: 'LBTC' });

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
        typedData });

      expect(storeNetworkFeeSignature).toHaveBeenCalledWith({
        address: '0x123',
        signature: '0xsig',
        typedData,
        env: Env.testnet });
    });

    it('should retrieve fee signature', async () => {
      vi.mocked(getNetworkFeeSignature).mockResolvedValue({
        hasSignature: true,
        signature: '0xsig',
        expirationDate: '2025-01-01',
        isDelayed: false });

      const result = await service.getFeeSignature({
        address: '0x123',
        chainId: ChainId.sepolia });

      expect(result.hasSignature).toBe(true);
      expect(result.signature).toBe('0xsig');
    });
  });
});

