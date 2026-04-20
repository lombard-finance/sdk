import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it, vi } from 'vitest';

import { getChainConfig } from '../../../chains/btc/actions/stake/config';
import { ChainId } from '../../../common/chains';
import { Chain } from '../../../core';
import { EvmService } from '../../../services/EvmService';
import { BtcCoreContext } from '../../../shared/context';

// Mock context
const mockEvm = {
  signNetworkFee: vi.fn().mockResolvedValue({
    signature: '0xsig',
    typedData: {},
  }),
  getMintingFee: vi.fn().mockResolvedValue('0.00001992'),
} as unknown as EvmService;

const mockCtx = {
  capabilities: {
    require: (id: string) => {
      if (id === 'evm') return mockEvm;
      throw new Error(`Capability ${id} not found`);
    },
  },
  api: {
    getFeeSignature: vi.fn().mockResolvedValue({}),
    storeFeeSignature: vi.fn(),
  },
  getProvider: vi.fn().mockResolvedValue({
    request: vi.fn().mockResolvedValue('0x1'), // Mock chainId response
  }),
  // Use prod env to match ChainId.ethereum (LBTC contract exists on mainnet in prod)
  env: Env.prod,
} as unknown as BtcCoreContext;

describe('FeeAuthConfig', () => {
  const evmConfig = getChainConfig('evm');

  it('should return FeeAuthConfig for Ethereum mainnet', () => {
    const feeAuth = evmConfig?.getFeeAuthConfig(Chain.ETHEREUM);
    
    expect(feeAuth).not.toBeNull();
    expect(feeAuth?.getMintingFee).toBeDefined();
    expect(feeAuth?.authorizeFee).toBeDefined();
  });

  it('should return null FeeAuthConfig for non-Ethereum EVM chains', () => {
    const feeAuth = evmConfig?.getFeeAuthConfig(Chain.BASE);
    
    expect(feeAuth).toBeNull();
  });

  describe('authorizeFee', () => {
    it('should convert fee to satoshis before signing', async () => {
      const feeAuth = evmConfig?.getFeeAuthConfig(Chain.ETHEREUM);
      expect(feeAuth).toBeDefined();

      if (!feeAuth) return;

      await feeAuth.authorizeFee(mockCtx, {
        chainId: ChainId.ethereum,
        recipient: '0x123',
        fee: '0.00001992', // BTC decimal
      });

      // Check if signNetworkFee was called with satoshis (1992)
      expect(mockEvm.signNetworkFee).toHaveBeenCalledWith(
        expect.objectContaining({
          fee: '1992', // Converted to satoshis
        }),
      );
    });
  });
});

