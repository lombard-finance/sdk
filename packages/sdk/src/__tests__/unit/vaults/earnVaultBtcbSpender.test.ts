import { describe, expect, it } from 'vitest';

import { ChainId } from '../../../common/chains';
import { Token } from '../../../tokens/token-addresses';
import {
  EARN_VAULT,
  EARN_VAULT_BTCB_SPENDER_CONTRACTS,
} from '../../../vaults/lib/config';

describe('EARN_VAULT_BTCB_SPENDER_CONTRACTS', () => {
  it('exposes the StakeAndBakeNativeToken contract on Ethereum mainnet', () => {
    const entry = EARN_VAULT_BTCB_SPENDER_CONTRACTS[ChainId.ethereum];
    expect(entry).toBeDefined();
    expect(entry?.address).toBe(
      '0xe6Cca4C07bF9F7778BfdEC839C1bbA1f3D4BDBa8',
    );
    expect(entry?.chainId).toBe(ChainId.ethereum);
    expect(entry?.abi).toBeDefined();
  });
});

describe('EARN_VAULT.tokens', () => {
  it('includes Token.BTCb on Ethereum', () => {
    expect(EARN_VAULT.tokens[Token.BTCb]).toContain(ChainId.ethereum);
  });
});
