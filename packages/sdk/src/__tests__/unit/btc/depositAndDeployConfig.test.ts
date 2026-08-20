/**
 * BTC deposit-and-deploy protocol availability
 *
 * `isProtocolChainSupported` is what every "can I deploy here" check funnels
 * through, and it looked its token up by the literal `'BTCb'`. The registry key
 * is `Token.BTCb`, which is `'BTC.b'`, so the lookup never matched and BTC to
 * BTC.b to Silo reported unsupported on every chain in every environment.
 *
 * The `as keyof typeof protocolRegistry` cast on the lookup is what let the
 * wrong literal through: without it, `'BTCb'` is not a key of the Silo registry
 * and the compiler says so. Asserting against the registry itself rather than
 * against a fixture is what keeps the two from drifting apart again.
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import {
  getSupportedProtocols,
  getVaultKey,
  isProtocolChainSupported,
  isProtocolSupported,
} from '../../../chains/btc/actions/depositAndDeploy/config';
import { ChainId } from '../../../common/chains';
import { AssetId } from '../../../core/assets/types';
import { DEFI_REGISTRY, DefiProtocol } from '../../../defi';
import { Token } from '../../../tokens/token-addresses';

/**
 * Where the registry actually says BTC.b can be deployed, read out of the
 * registry rather than restated. If this comes back empty the assertions below
 * would pass vacuously, so it is checked.
 */
function registryChainsForBtcb(): Array<{
  protocol: DefiProtocol;
  env: Env;
  chainId: number;
}> {
  const rows: Array<{ protocol: DefiProtocol; env: Env; chainId: number }> = [];

  for (const [protocol, tokenMap] of Object.entries(DEFI_REGISTRY)) {
    const byEnv = (tokenMap as Record<string, unknown>)[Token.BTCb];
    if (!byEnv) continue;

    for (const [env, byChain] of Object.entries(
      byEnv as Record<string, Record<string, unknown>>,
    )) {
      for (const chainId of Object.keys(byChain)) {
        rows.push({
          protocol: protocol as DefiProtocol,
          env: env as Env,
          chainId: Number(chainId),
        });
      }
    }
  }

  return rows;
}

describe('the registry itself', () => {
  it('keys BTC.b under Token.BTCb, not the letters BTCb', () => {
    // The premise of the bug. Token.BTCb is 'BTC.b'; a literal 'BTCb' is not a
    // key of anything in the registry.
    expect(Token.BTCb).toBe('BTC.b');
    expect(DEFI_REGISTRY[DefiProtocol.Silo]).toHaveProperty(Token.BTCb);
    expect(DEFI_REGISTRY[DefiProtocol.Silo]).not.toHaveProperty('BTCb');
  });

  it('has at least one BTC.b deployment, so the sweep below is not vacuous', () => {
    expect(registryChainsForBtcb().length).toBeGreaterThan(0);
  });
});

describe('isProtocolChainSupported', () => {
  it.each(registryChainsForBtcb())(
    'reports $protocol supported on chain $chainId in $env',
    ({ protocol, env, chainId }) => {
      expect(isProtocolChainSupported(protocol, chainId, env)).toBe(true);
    },
  );

  it('reports Silo supported on Avalanche Fuji under testnet', () => {
    // Named explicitly because it is the route the wrong key made unreachable.
    expect(
      isProtocolChainSupported(
        DefiProtocol.Silo,
        ChainId.avalancheFuji,
        Env.testnet,
      ),
    ).toBe(true);
  });

  it('does not report Silo on an environment the registry omits', () => {
    // Silo is testnet-only, so prod and stage must stay false. A fix that made
    // the lookup succeed unconditionally would pass the assertions above and
    // fail here.
    expect(
      isProtocolChainSupported(
        DefiProtocol.Silo,
        ChainId.avalancheFuji,
        Env.prod,
      ),
    ).toBe(false);
    expect(
      isProtocolChainSupported(
        DefiProtocol.Silo,
        ChainId.avalancheFuji,
        Env.stage,
      ),
    ).toBe(false);
  });

  it('does not report Silo on a chain the registry omits', () => {
    expect(
      isProtocolChainSupported(
        DefiProtocol.Silo,
        ChainId.ethereum,
        Env.testnet,
      ),
    ).toBe(false);
  });

  it('rejects a protocol with no BTC.b entry', () => {
    // Veda carries LBTC and the virtual BTC key, not BTC.b, so this route is
    // genuinely unavailable rather than mis-keyed.
    expect(
      isProtocolChainSupported(DefiProtocol.Veda, ChainId.ethereum, Env.prod),
    ).toBe(false);
  });

  it('rejects an unknown protocol', () => {
    expect(isProtocolChainSupported('not-a-protocol', 1, Env.prod)).toBe(false);
  });
});

describe('isProtocolSupported', () => {
  it('accepts every protocol in the registry', () => {
    for (const protocol of Object.keys(DEFI_REGISTRY)) {
      expect(isProtocolSupported(protocol)).toBe(true);
    }
  });

  it('rejects an unknown protocol', () => {
    expect(isProtocolSupported('not-a-protocol')).toBe(false);
  });
});

describe('getSupportedProtocols', () => {
  it('returns Silo for BTC.b', () => {
    expect(getSupportedProtocols(AssetId.BTCb)).toContain(DefiProtocol.Silo);
  });

  it('returns Veda for LBTC', () => {
    expect(getSupportedProtocols(AssetId.LBTC)).toContain(DefiProtocol.Veda);
  });

  it('returns nothing for an asset with no vault route', () => {
    expect(getSupportedProtocols(AssetId.WBTC)).toEqual([]);
  });
});

describe('getVaultKey', () => {
  it('returns the protocol id unchanged for a supported protocol', () => {
    expect(getVaultKey(DefiProtocol.Silo)).toBe(DefiProtocol.Silo);
  });

  it('throws for an unsupported protocol, naming the supported ones', () => {
    expect(() => getVaultKey('not-a-protocol')).toThrow(/Supported protocols/);
  });
});
