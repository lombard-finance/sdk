import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../common/chains';
import { EvmService } from '../../services/EvmService';

// Mock dependencies
vi.mock('../../contract-functions/getLBTCMintingFee/getLBTCMintingFee', () => ({
  getMintingFee: vi.fn(),
}));

import { getMintingFee } from '../../contract-functions/getLBTCMintingFee/getLBTCMintingFee';

describe('EvmService', () => {
  let service: EvmService;

  beforeEach(() => {
    service = new EvmService(Env.testnet);
    vi.clearAllMocks();
  });

  describe('getMintingFee', () => {
    it('should return minting fee as BTC decimal string', async () => {
      vi.mocked(getMintingFee).mockResolvedValue(new BigNumber('0.00001992'));
      
      const fee = await service.getMintingFee(ChainId.sepolia);
      
      expect(fee).toBe('0.00001992');
      expect(typeof fee).toBe('string');
      expect(getMintingFee).toHaveBeenCalledWith({
        chainId: ChainId.sepolia,
        env: Env.testnet,
        token: 'LBTC',
      });
    });
  });
});

