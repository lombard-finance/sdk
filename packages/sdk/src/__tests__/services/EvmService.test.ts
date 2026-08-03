import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../common/chains';
import { EvmService } from '../../services/EvmService';

// Mock dependencies
vi.mock('../../contract-functions/getLBTCMintingFee/getLBTCMintingFee', () => ({
  getMintingFee: vi.fn(),
}));
vi.mock('../../contract-functions/signStakeAndBake/signStakeAndBake', () => ({
  signStakeAndBake: vi.fn(),
}));

import { getMintingFee } from '../../contract-functions/getLBTCMintingFee/getLBTCMintingFee';
import { signStakeAndBake } from '../../contract-functions/signStakeAndBake/signStakeAndBake';

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

  describe('signStakeAndBake', () => {
    /** A fixed absolute UNIX timestamp (seconds). */
    const CUSTOM_EXPIRY = 1893456000;

    const baseParams = {
      value: '10000000',
      account: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      chainId: ChainId.sepolia,
      provider: {} as never,
      vaultKey: 'veda',
      token: 'BTC',
    };

    beforeEach(() => {
      vi.mocked(signStakeAndBake).mockResolvedValue({
        mode: 'permit',
        signature: '0xsig',
        typedData: '{"typed":true}',
      });
    });

    it('should forward a caller-supplied expiry to signStakeAndBake', async () => {
      await service.signStakeAndBake({
        ...baseParams,
        expiry: CUSTOM_EXPIRY,
      });

      expect(signStakeAndBake).toHaveBeenCalledWith(
        expect.objectContaining({ expiry: CUSTOM_EXPIRY }),
      );
    });

    it('should pass expiry as undefined when omitted so the 24h default applies', async () => {
      await service.signStakeAndBake(baseParams);

      const [params] = vi.mocked(signStakeAndBake).mock.calls[0];
      expect(params.expiry).toBeUndefined();
    });
  });
});
