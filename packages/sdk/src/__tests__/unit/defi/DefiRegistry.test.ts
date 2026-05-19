import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../../../common/chains';
import { DEFI_REGISTRY, DefiProtocol } from '../../../defi/defi-registry';
import { Token } from '../../../tokens/token-addresses';

describe('DEFI_REGISTRY', () => {
  it('should have Veda protocol with LBTC support', () => {
    expect(DEFI_REGISTRY[DefiProtocol.Veda]).toBeDefined();
    expect(DEFI_REGISTRY[DefiProtocol.Veda][Token.LBTC]).toBeDefined();
  });

  it('should have Silo only on testnet for BTCb', () => {
    // Silo is defined for BTCb
    const siloBtcb = DEFI_REGISTRY[DefiProtocol.Silo][Token.BTCb];
    expect(siloBtcb).toBeDefined();

    // Check testnet support
    expect(siloBtcb?.[Env.testnet]).toBeDefined();

    // Check prod support (should be undefined based on current implementation)
    expect(siloBtcb?.[Env.prod]).toBeUndefined();
  });

  describe('Veda BTC.b strategy', () => {
    it('exposes a strategy for Token.BTCb on Ethereum in prod', () => {
      const strategy =
        DEFI_REGISTRY[DefiProtocol.Veda][Token.BTCb]?.[Env.prod]?.[
          ChainId.ethereum
        ];
      expect(strategy).toBeDefined();
      expect(strategy?.spenderContract.address).toBe(
        '0xe6Cca4C07bF9F7778BfdEC839C1bbA1f3D4BDBa8',
      );
      expect(strategy?.amountStrategy).toBe('identity');
    });

    it('uses permit mode with the on-chain EIP-712 domain (Bitcoin v1)', () => {
      const strategy =
        DEFI_REGISTRY[DefiProtocol.Veda][Token.BTCb]?.[Env.prod]?.[
          ChainId.ethereum
        ];
      expect(strategy?.approval.mode).toBe('permit');
      expect(strategy?.approval.domainName).toBe('Bitcoin');
      expect(strategy?.approval.domainVersion).toBe('1');
      expect(strategy?.approval.deadlineStrategy).toBe('expiry');
      expect(strategy?.approval.nonceStrategy).toBe('chain');
    });

    it('is not configured on chains without a deployed spender', () => {
      const sepolia =
        DEFI_REGISTRY[DefiProtocol.Veda][Token.BTCb]?.[Env.prod]?.[
          ChainId.sepolia
        ];
      expect(sepolia).toBeUndefined();
    });
  });
});
