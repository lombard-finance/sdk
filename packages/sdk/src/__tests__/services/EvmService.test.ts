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

  /**
   * The service is the hop between the BTC deploy actions and the low-level
   * signer. `expiry` was unreachable from any caller because this method could
   * not forward one, so its absence here is what made the whole feature dead.
   */
  describe('signStakeAndBake', () => {
    const params = {
      value: '1000000',
      account: '0x1111111111111111111111111111111111111111' as const,
      chainId: ChainId.sepolia,
      provider: {} as never,
      vaultKey: 'bitcoinEarn',
      token: 'LBTC',
    };

    beforeEach(() => {
      vi.mocked(signStakeAndBake).mockResolvedValue({
        signature: '0xsig',
        typedData: '{"typed":"data"}',
      } as never);
    });

    it('forwards an explicit expiry', async () => {
      const expiry = 1893456000;

      await service.signStakeAndBake({ ...params, expiry });

      expect(signStakeAndBake).toHaveBeenCalledWith(
        expect.objectContaining({ expiry }),
      );
    });

    // Deliberately undefined rather than a computed default: signStakeAndBake
    // owns the 24h fallback, and duplicating it here would give the SDK two
    // places to change it.
    it('passes undefined when no expiry is given', async () => {
      await service.signStakeAndBake(params);

      expect(signStakeAndBake).toHaveBeenCalledWith(
        expect.objectContaining({ expiry: undefined }),
      );
    });

    it('returns the signature unchanged', async () => {
      await expect(service.signStakeAndBake(params)).resolves.toMatchObject({
        signature: '0xsig',
      });
    });
  });
});
