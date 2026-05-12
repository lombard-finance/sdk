import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentBlockHeight } from '../../chains/btc/client/getCurrentBlockHeight';
import { BtcService } from '../../services/BtcService';

// Mock dependencies
vi.mock('../../chains/btc/client/getCurrentBlockHeight', () => ({
  getCurrentBlockHeight: vi.fn(),
}));

describe('BtcService', () => {
  let service: BtcService;

  beforeEach(() => {
    service = new BtcService();
    vi.clearAllMocks();
  });

  describe('getCurrentBlockHeight', () => {
    it('should return block height', async () => {
      vi.mocked(getCurrentBlockHeight).mockResolvedValue(123456);

      const height = await service.getCurrentBlockHeight('testnet');

      expect(height).toBe(123456);
      expect(getCurrentBlockHeight).toHaveBeenCalledWith('testnet');
    });
  });
});
