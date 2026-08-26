/**
 * Shared BTC action validation
 *
 * `validateBtcActionParams` is the gatekeeper every BTC action runs its params
 * through, and it was at 8.8% statement coverage. It decides which routes are
 * legal, so it is also where the release's "every route in the table constructs,
 * every route outside it throws" property actually lives.
 *
 * The last block drives the assertions off the shipped configs rather than
 * fixtures, so a route added to or removed from a config without a matching
 * test change still gets checked.
 */

import { describe, expect, it } from 'vitest';

import { depositAndDeployConfig } from '../../../chains/btc/actions/deploy-btcb/config';
import { stakeAndDeployConfig } from '../../../chains/btc/actions/deploy-lbtc/config';
import { depositConfigs } from '../../../chains/btc/actions/deposit-btcb/config';
import { chainConfigs as stakeChainConfigs } from '../../../chains/btc/actions/deposit-lbtc/config';
import {
  isAssetSupported,
  isDestChainSupported,
  isRouteAvailable,
  type ValidatableConfig,
  validateBtcActionParams,
  validateProtocol,
} from '../../../chains/btc/actions/shared/validation';
import { AssetId, Chain } from '../../../core';
import { LombardError } from '../../../shared/errors';

const ENV_PROD = 'prod' as never;
const ENV_TESTNET = 'testnet' as never;

/** A config with one route, deliberately narrow so each rejection is isolated. */
function configFixture(
  overrides: Partial<ValidatableConfig> = {},
): ValidatableConfig {
  return {
    destChains: [Chain.ETHEREUM, Chain.BASE],
    supportedAssetsOut: [AssetId.LBTC],
    routes: [
      { sourceChains: [Chain.BITCOIN_MAINNET], envs: [ENV_PROD] },
      { sourceChains: [Chain.BITCOIN_SIGNET], envs: [ENV_TESTNET] },
    ],
    ...overrides,
  };
}

const context = {
  env: ENV_PROD,
  actionName: 'BTC Stake',
  expectedAssets: [AssetId.LBTC],
};

describe('isAssetSupported', () => {
  it('accepts a listed asset', () => {
    expect(isAssetSupported([AssetId.LBTC, AssetId.BTCb], AssetId.LBTC)).toBe(
      true,
    );
  });

  it('rejects an unlisted asset', () => {
    expect(isAssetSupported([AssetId.LBTC], AssetId.BTCb)).toBe(false);
  });

  it('rejects everything when the list is empty', () => {
    expect(isAssetSupported([], AssetId.LBTC)).toBe(false);
  });
});

describe('isDestChainSupported', () => {
  it('accepts a listed chain', () => {
    expect(isDestChainSupported([Chain.ETHEREUM], Chain.ETHEREUM)).toBe(true);
  });

  it('rejects an unlisted chain', () => {
    expect(isDestChainSupported([Chain.ETHEREUM], Chain.BASE)).toBe(false);
  });
});

describe('isRouteAvailable', () => {
  const routes = configFixture().routes;

  it('matches on source chain and env together', () => {
    expect(isRouteAvailable(routes, Chain.BITCOIN_MAINNET, ENV_PROD)).toBe(
      true,
    );
  });

  it('rejects the right source chain in the wrong env', () => {
    expect(isRouteAvailable(routes, Chain.BITCOIN_MAINNET, ENV_TESTNET)).toBe(
      false,
    );
  });

  it('rejects the right env with the wrong source chain', () => {
    expect(isRouteAvailable(routes, Chain.BITCOIN_SIGNET, ENV_PROD)).toBe(
      false,
    );
  });

  it('rejects a source chain in no route at all', () => {
    expect(isRouteAvailable(routes, Chain.ETHEREUM, ENV_PROD)).toBe(false);
  });

  // Documented behaviour, and the reason a missing sourceChain cannot be relied
  // on as a rejection: an omitted source chain permits every route.
  it('allows anything when no source chain is given', () => {
    expect(isRouteAvailable(routes, undefined, ENV_PROD)).toBe(true);
  });

  it('rejects everything when the route list is empty', () => {
    expect(isRouteAvailable([], Chain.BITCOIN_MAINNET, ENV_PROD)).toBe(false);
  });
});

describe('validateBtcActionParams', () => {
  it('passes a legal combination', () => {
    expect(() =>
      validateBtcActionParams(
        configFixture(),
        {
          assetOut: AssetId.LBTC,
          destChain: Chain.ETHEREUM,
          sourceChain: Chain.BITCOIN_MAINNET,
        },
        context,
      ),
    ).not.toThrow();
  });

  it('rejects an unsupported asset with INVALID_ASSET', () => {
    try {
      validateBtcActionParams(
        configFixture(),
        { assetOut: AssetId.BTCb, destChain: Chain.ETHEREUM },
        context,
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(LombardError);
      expect((error as LombardError).code).toBe('invalid-asset');
      // The message has to name what is supported, or the caller cannot act on it.
      expect((error as LombardError).message).toContain(AssetId.LBTC);
    }
  });

  it('names the alternative action when the context supplies one', () => {
    try {
      validateBtcActionParams(
        configFixture(),
        { assetOut: AssetId.BTCb, destChain: Chain.ETHEREUM },
        { ...context, alternativeAction: 'assetOut: AssetId.BTCb' },
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as LombardError).message).toContain(
        'Use assetOut: AssetId.BTCb instead.',
      );
    }
  });

  it('omits the alternative clause when the context has none', () => {
    try {
      validateBtcActionParams(
        configFixture(),
        { assetOut: AssetId.BTCb, destChain: Chain.ETHEREUM },
        context,
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as LombardError).message).not.toContain('instead');
    }
  });

  it('rejects an unsupported destination chain with INVALID_CHAIN', () => {
    try {
      validateBtcActionParams(
        configFixture(),
        { assetOut: AssetId.LBTC, destChain: Chain.BSC },
        context,
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as LombardError).code).toBe('invalid-chain');
      expect((error as LombardError).message).toContain(context.actionName);
    }
  });

  it('rejects an unavailable route with ROUTE_NOT_FOUND', () => {
    try {
      validateBtcActionParams(
        configFixture(),
        {
          assetOut: AssetId.LBTC,
          destChain: Chain.ETHEREUM,
          sourceChain: Chain.BITCOIN_SIGNET,
        },
        context,
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as LombardError).code).toBe('route-not-found');
      // The metadata carries the rejected combination, which is what makes the
      // error debuggable from a log line.
      expect((error as LombardError).metadata).toMatchObject({
        assetOut: AssetId.LBTC,
        sourceChain: Chain.BITCOIN_SIGNET,
        destChain: Chain.ETHEREUM,
        env: ENV_PROD,
      });
    }
  });

  // Order matters: an asset failure must not be reported as a chain failure,
  // because the two carry different remediation.
  it('reports the asset failure first when asset and chain are both wrong', () => {
    try {
      validateBtcActionParams(
        configFixture(),
        { assetOut: AssetId.BTCb, destChain: Chain.BSC },
        context,
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as LombardError).code).toBe('invalid-asset');
    }
  });

  it('reports the chain failure before the route failure', () => {
    try {
      validateBtcActionParams(
        configFixture(),
        {
          assetOut: AssetId.LBTC,
          destChain: Chain.BSC,
          sourceChain: Chain.ETHEREUM,
        },
        context,
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as LombardError).code).toBe('invalid-chain');
    }
  });
});

describe('validateProtocol', () => {
  it('accepts a supported protocol', () => {
    expect(() =>
      validateProtocol(
        ['bitcoinEarn', 'silo'],
        'bitcoinEarn',
        'BTC Stake and Deploy',
      ),
    ).not.toThrow();
  });

  it('rejects an unsupported one, naming what is supported', () => {
    try {
      validateProtocol(['bitcoinEarn'], 'silo', 'BTC Stake and Deploy');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as LombardError).code).toBe('invalid-parameter');
      expect((error as LombardError).message).toContain('silo');
      expect((error as LombardError).message).toContain(
        'Supported: bitcoinEarn',
      );
    }
  });

  it('is case sensitive, so a display-cased protocol is rejected', () => {
    expect(() => validateProtocol(['bitcoinEarn'], 'BitcoinEarn', 'x')).toThrow(
      LombardError,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Driven off the shipped configs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Every route a config declares must validate, and a source chain absent from
 * every route must be rejected. This is the release property "every route in the
 * table constructs; every route outside it throws", asserted at the validation
 * layer over the real tables rather than fixtures.
 */
describe('the shipped configs validate their own routes', () => {
  const suites: Array<[string, ValidatableConfig]> = [
    ...Object.entries(stakeChainConfigs).map(
      ([chainType, config]): [string, ValidatableConfig] => [
        `stake/${chainType}`,
        config as unknown as ValidatableConfig,
      ],
    ),
    ...Object.entries(depositConfigs).map(
      ([chainType, config]): [string, ValidatableConfig] => [
        `deposit/${chainType}`,
        config as unknown as ValidatableConfig,
      ],
    ),
    [
      'depositAndDeploy',
      depositAndDeployConfig as unknown as ValidatableConfig,
    ],
    ['stakeAndDeploy', stakeAndDeployConfig as unknown as ValidatableConfig],
  ];

  it('finds configs to check, so an empty sweep cannot pass vacuously', () => {
    expect(suites.length).toBeGreaterThanOrEqual(5);
  });

  describe.each(suites)('%s', (_name, config) => {
    it('accepts every declared route', () => {
      for (const route of config.routes) {
        for (const env of route.envs) {
          for (const sourceChain of route.sourceChains) {
            expect(
              isRouteAvailable(config.routes, sourceChain, env),
              `${sourceChain} in ${env}`,
            ).toBe(true);
          }
        }
      }
    });

    it('accepts every declared asset and destination chain', () => {
      for (const assetOut of config.supportedAssetsOut) {
        expect(isAssetSupported(config.supportedAssetsOut, assetOut)).toBe(
          true,
        );
      }
      for (const destChain of config.destChains) {
        expect(isDestChainSupported(config.destChains, destChain)).toBe(true);
      }
    });

    it('rejects a source chain no route declares', () => {
      const declared = new Set(config.routes.flatMap((r) => r.sourceChains));
      const undeclared = [
        Chain.BITCOIN_MAINNET,
        Chain.BITCOIN_SIGNET,
        Chain.ETHEREUM,
        Chain.BASE,
        Chain.BSC,
      ].find((chain) => !declared.has(chain));

      // Every config declares only Bitcoin source chains, so an EVM chain is
      // always available as the negative case.
      expect(undeclared).toBeDefined();
      for (const env of [ENV_PROD, ENV_TESTNET]) {
        expect(isRouteAvailable(config.routes, undeclared!, env)).toBe(false);
      }
    });

    it('declares at least one route and one asset', () => {
      expect(config.routes.length).toBeGreaterThan(0);
      expect(config.supportedAssetsOut.length).toBeGreaterThan(0);
      expect(config.destChains.length).toBeGreaterThan(0);
    });
  });
});
