import { describe, expect, it } from 'vitest';

import { ChainId } from '../../../common/chains';
import { getVaultBlockchainParam } from '../../../strategies/lib/metrics/userEndpoints';

describe('getVaultBlockchainParam', () => {
  it('maps mainnets to their legacy BLOCKCHAIN_* identifiers', () => {
    expect(getVaultBlockchainParam(ChainId.ethereum)).toBe('BLOCKCHAIN_ETHEREUM');
    expect(getVaultBlockchainParam(ChainId.base)).toBe('BLOCKCHAIN_BASE');
  });

  it('maps testnets to their network-specific identifiers', () => {
    // Ethereum Sepolia hosts the testnet BTCoc strategy; the vault-manager
    // rejects it under the mainnet identifier, so it must be its own value.
    expect(getVaultBlockchainParam(ChainId.sepolia)).toBe(
      'BLOCKCHAIN_ETHEREUM_SEPOLIA',
    );
    expect(getVaultBlockchainParam(ChainId.baseSepoliaTestnet)).toBe(
      'BLOCKCHAIN_BASE_SEPOLIA',
    );
  });

  it('throws for a chain the vault-manager has no identifier for', () => {
    expect(() => getVaultBlockchainParam(ChainId.avalanche)).toThrow(
      /not configured for chain id/,
    );
  });
});
