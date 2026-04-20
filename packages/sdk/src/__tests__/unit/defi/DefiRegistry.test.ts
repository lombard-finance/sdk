import { Env } from '@lombard.finance/sdk-common';
import { describe, expect,it } from 'vitest';

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
});

