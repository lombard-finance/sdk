/**
 * Wallet-auth chain names
 *
 * The expectations here are not derived from the implementation — they were read
 * off the live `/v2/auth/wallet/challenge` endpoint on both the mainnet and
 * testnet gateways, which answer `unsupported blockchain` for a name they do not
 * accept. Three facts came out of that, and each one is a case below:
 *
 *   1. Mainnet rejects every env-suffixed name (`ethereum_sepolia`,
 *      `base_sepolia`, `solana_devnet`, `starknet_sepolia`, `sui_testnet`).
 *   2. Testnet accepts the suffixed *and* the plain form, so the plain form is
 *      the only one correct on both.
 *   3. The suffixes are not the chain slugs used elsewhere in the SDK. Sonic's
 *      testnet slug is `blaze`, and `sonic_blaze` is rejected by both gateways —
 *      so deriving a name by appending a slug produces a chain that cannot
 *      authenticate at all.
 *
 * Fact 3 is why this returns one unsuffixed name per chain family rather than
 * consulting the env: the env already picks the gateway, and suffixing is the
 * step that introduces the bug.
 */

import { describe, expect, it } from 'vitest';

import {
  ChainId,
  SOLANA_DEVNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
  STARKNET_MAINNET_CHAIN,
  STARKNET_SEPOLIA_CHAIN,
  SUI_MAINNET_CHAIN,
  SUI_TESTNET_CHAIN,
} from '../../../common/chains';
import {
  walletAuthChainName,
  walletAuthChainNames,
} from '../../../common/wallet-auth-chain';

describe('walletAuthChainName', () => {
  it('names each EVM family the way /v2/chains does', () => {
    expect(walletAuthChainName(ChainId.ethereum)).toBe('ethereum');
    expect(walletAuthChainName(ChainId.base)).toBe('base');
    expect(walletAuthChainName(ChainId.binanceSmartChain)).toBe('bsc');
    expect(walletAuthChainName(ChainId.avalanche)).toBe('avalanche');
    expect(walletAuthChainName(ChainId.sonic)).toBe('sonic');
    expect(walletAuthChainName(ChainId.katana)).toBe('katana');
  });

  it('names the non-EVM chains', () => {
    expect(walletAuthChainName(SOLANA_MAINNET_CHAIN)).toBe('solana');
    expect(walletAuthChainName(SUI_MAINNET_CHAIN)).toBe('sui');
    expect(walletAuthChainName(STARKNET_MAINNET_CHAIN)).toBe('starknet');
  });

  /**
   * The heart of it. A testnet chain id resolves to the same unsuffixed name as
   * its mainnet counterpart, because that is what the testnet gateway wants and
   * the only form the mainnet gateway will take.
   */
  it('gives a testnet the same name as its mainnet', () => {
    const pairs: ReadonlyArray<readonly [unknown, unknown, string]> = [
      [ChainId.ethereum, ChainId.sepolia, 'ethereum'],
      [ChainId.base, ChainId.baseSepoliaTestnet, 'base'],
      [
        ChainId.binanceSmartChain,
        ChainId.binanceSmartChainTestnet,
        'bsc',
      ],
      [ChainId.avalanche, ChainId.avalancheFuji, 'avalanche'],
      // The case a slug-derived name gets wrong: `sonic_blaze` is rejected.
      [ChainId.sonic, ChainId.sonicBlazeTestnet, 'sonic'],
      [SOLANA_MAINNET_CHAIN, SOLANA_DEVNET_CHAIN, 'solana'],
      [SUI_MAINNET_CHAIN, SUI_TESTNET_CHAIN, 'sui'],
      [STARKNET_MAINNET_CHAIN, STARKNET_SEPOLIA_CHAIN, 'starknet'],
    ];

    for (const [mainnet, testnet, expected] of pairs) {
      expect(walletAuthChainName(mainnet as ChainId)).toBe(expected);
      expect(walletAuthChainName(testnet as ChainId)).toBe(expected);
    }
  });

  it('never returns a suffixed name, for any chain it supports', () => {
    // Mainnet rejects every one of those, so emitting one is always a bug.
    expect(walletAuthChainNames().filter((n) => n.includes('_'))).toEqual([]);
  });

  describe('chains it will not name', () => {
    /**
     * No fallback to Ethereum, deliberately. For an EOA the name does not
     * change the outcome, but a smart-contract wallet is verified by an ERC-1271
     * call *on the named chain* — so a Safe that exists only on one chain and is
     * submitted as another can never verify, and the challenge call before it
     * still returns 200. A throw is the only way that surfaces at the call site.
     */
    it('throws on an unknown chain rather than guessing', () => {
      expect(() => walletAuthChainName(999_999_999 as ChainId)).toThrow();
    });
  });
});

describe('walletAuthChainNames', () => {
  it('lists every supported name, sorted', () => {
    const names = walletAuthChainNames();

    expect(names).toEqual([...names].sort());
    expect(names).toContain('ethereum');
    expect(names).toContain('starknet');
  });

  it('agrees with what walletAuthChainName returns', () => {
    expect(walletAuthChainNames()).toContain(
      walletAuthChainName(ChainId.ethereum),
    );
  });
});
