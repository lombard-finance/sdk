/**
 * The v6 action contract
 *
 * Stage B lands the type contract everything downstream imports, so its
 * assertions are a mix of runtime checks and type-level ones. The type-level
 * assertions gate through `tsc --noEmit`, which `yarn build` runs before vite
 * and CI runs before the suite — so a broken contract fails the build, not just
 * this file.
 *
 * `@ts-expect-error` is the mechanism for the negative cases: if the line it
 * guards ever starts compiling, tsc reports the directive as unused and the
 * build fails. That is what makes "this must not compile" enforceable.
 */

import { describe, expect, it } from 'vitest';

import type {
  ActionProgress,
  ActionResult,
  ActionSteps,
  DeployParams,
  DepositParams,
  PrepareParams,
  ReachableActionStatus,
  WithdrawParams,
} from '../../../../core/actions';
import {
  ACTION_STEP_KEYS,
  ActionStatus,
  AUTHORIZATION_STATUSES,
  isAddressResult,
  isAuthorizationStatus,
  isTerminalStatus,
  isTxResult,
  REGISTRY_TOKEN_ROWS,
  resolveRegistryToken,
  shares,
  TERMINAL_STATUSES,
} from '../../../../core/actions';
import { AssetId } from '../../../../core/assets/types';
import { Chain } from '../../../../core/chains/types';
import type { StrategyProgress } from '../../../../core/types';
import { DefiProtocol } from '../../../../defi/defi-registry';
import { Token } from '../../../../tokens/token-addresses';

/** Compile-time equality. Distributes correctly for unions. */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

function assertType<T extends true>(_: T): void {
  /* the constraint is the assertion */
}

// ═══════════════════════════════════════════════════════════════════════════
// B1: ActionSteps stays assignable to StrategyProgress['steps']
// ═══════════════════════════════════════════════════════════════════════════

describe('ActionSteps', () => {
  it('names exactly five steps, in order', () => {
    expect(ACTION_STEP_KEYS).toEqual([
      'authorizing',
      'awaitingFunds',
      'submitting',
      'confirming',
      'settling',
    ]);
  });

  it('is assignable to the progress step record', () => {
    // The runtime half of the standing assertion in steps.ts. Declaring
    // ActionSteps as an interface, or widening any member past StepStatus,
    // breaks the compile-time half.
    assertType<
      ActionSteps extends StrategyProgress<string>['steps'] ? true : false
    >(true);

    const steps: ActionSteps = {
      authorizing: 'complete',
      awaitingFunds: 'idle',
      submitting: 'pending',
      confirming: 'idle',
      settling: 'idle',
    };
    const asRecord: StrategyProgress<string>['steps'] = steps;

    expect(Object.keys(asRecord)).toHaveLength(5);
  });

  it('requires every key, so a partial payload cannot be emitted', () => {
    // @ts-expect-error - settling is missing; filtering the payload is what the
    // five-always-present rule exists to prevent.
    const partial: ActionSteps = {
      authorizing: 'idle',
      awaitingFunds: 'idle',
      submitting: 'idle',
      confirming: 'idle',
    };

    void partial;
    expect(true).toBe(true);
  });

  it('carries the multi-transaction position beside the steps, not inside', () => {
    const progress: ActionProgress = {
      status: ActionStatus.CONFIRMING,
      steps: {
        authorizing: 'complete',
        awaitingFunds: 'idle',
        submitting: 'complete',
        confirming: 'pending',
        settling: 'idle',
      },
      submission: { index: 2, of: 3 },
    };

    expect(progress.submission).toEqual({ index: 2, of: 3 });
    // A renderer that only knows StepStatus still reads the step.
    expect(progress.steps.submitting).toBe('complete');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B2: every declared status is reachable from some action's narrowing
// ═══════════════════════════════════════════════════════════════════════════

describe('ActionStatus', () => {
  it('has no failure member', () => {
    // Deliberate: BaseAction freezes status where the failure happened, so
    // status answers where and hasFailed answers whether.
    expect(Object.values(ActionStatus)).not.toContain('failed');
    expect(Object.keys(ActionStatus)).not.toContain('FAILED');
  });

  it('every declared status is reachable from some action', () => {
    // The property B2 exists for. A status nothing can report is either a
    // design mistake or a missing narrowing; both should fail rather than ship.
    assertType<Equals<ActionStatus, ReachableActionStatus>>(true);
    expect(true).toBe(true);
  });

  it('includes QUEUED, the new terminal for the vault exit', () => {
    expect(ActionStatus.QUEUED).toBe('queued');
    expect(isTerminalStatus(ActionStatus.QUEUED)).toBe(true);
  });

  it('spells the approval status with an underscore', () => {
    // Renamed from v5's 'needs-approval'. A wire-value change, listed as
    // breaking.
    expect(ActionStatus.NEEDS_APPROVAL).toBe('needs_approval');
  });

  it('uses underscores consistently across every value', () => {
    for (const value of Object.values(ActionStatus)) {
      expect(value, `${value} must not contain a hyphen`).not.toContain('-');
    }
  });

  it('classifies the four authorization statuses', () => {
    expect(AUTHORIZATION_STATUSES).toHaveLength(4);
    for (const status of AUTHORIZATION_STATUSES) {
      expect(isAuthorizationStatus(status)).toBe(true);
    }
    expect(isAuthorizationStatus(ActionStatus.READY)).toBe(false);
  });

  it('classifies the three terminal statuses', () => {
    expect(TERMINAL_STATUSES).toEqual(['address_ready', 'queued', 'completed']);
    // ADDRESS_READY is terminal for the SDK's part of a Bitcoin-source route:
    // the next event comes from the user, not the action.
    expect(isTerminalStatus(ActionStatus.ADDRESS_READY)).toBe(true);
    expect(isTerminalStatus(ActionStatus.CONFIRMING)).toBe(false);
  });

  it('does not treat an authorization status as terminal', () => {
    for (const status of AUTHORIZATION_STATUSES) {
      expect(isTerminalStatus(status)).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B3: the never guards on the parameter unions
// ═══════════════════════════════════════════════════════════════════════════

describe('DepositParams', () => {
  it('accepts the asset-to-asset arm', () => {
    const params: DepositParams = {
      assetIn: AssetId.BTC,
      assetOut: AssetId.LBTC,
      destChain: Chain.ETHEREUM,
    };
    expect(params.assetIn).toBe(AssetId.BTC);
  });

  it('accepts the protocol arm', () => {
    const params: DepositParams = {
      assetIn: AssetId.BTC,
      protocol: DefiProtocol.Veda,
      destChain: Chain.ETHEREUM,
    };
    expect(params.protocol).toBe('veda');
  });

  it('rejects both assetOut and protocol', () => {
    const literal = {
      assetIn: AssetId.BTC,
      assetOut: AssetId.LBTC,
      protocol: DefiProtocol.Veda,
    };

    // @ts-expect-error - saying both is saying two contradictory things about
    // where the value goes.
    const both: DepositParams = literal;

    void both;
    expect(true).toBe(true);
  });

  it('rejects neither assetOut nor protocol', () => {
    // @ts-expect-error - a deposit with no destination is not a deposit.
    const neither: DepositParams = { assetIn: AssetId.BTC };
    void neither;
    expect(true).toBe(true);
  });
});

describe('WithdrawParams', () => {
  it('accepts the asset-to-asset arm', () => {
    const params: WithdrawParams = {
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
    };
    expect(params.assetOut).toBe(AssetId.BTC);
  });

  it('accepts the vault arm with no assetIn', () => {
    const params: WithdrawParams = {
      protocol: DefiProtocol.Veda,
      assetOut: AssetId.LBTC,
    };
    expect(params.protocol).toBe('veda');
  });

  it('rejects assetIn on a vault withdrawal', () => {
    const literal = {
      protocol: DefiProtocol.Veda,
      assetOut: AssetId.LBTC,
      assetIn: AssetId.LBTC,
    };

    // @ts-expect-error - the shares being burned have no AssetId, so naming an
    // input asset asserts something the vault does not model.
    const withAssetIn: WithdrawParams = literal;

    void withAssetIn;
    expect(true).toBe(true);
  });
});

describe('DeployParams', () => {
  it('takes an asset and a protocol', () => {
    const params: DeployParams = {
      asset: AssetId.BTC,
      protocol: DefiProtocol.Veda,
      destChain: Chain.ETHEREUM,
    };
    expect(params.asset).toBe(AssetId.BTC);
  });

  it('rejects assetOut', () => {
    const literal = {
      asset: AssetId.BTC,
      protocol: DefiProtocol.Veda,
      assetOut: AssetId.LBTC,
    };

    // @ts-expect-error - a vault deposit returns share tokens, and no AssetId
    // names them. That is why deploy is its own verb.
    const withAssetOut: DeployParams = literal;

    void withAssetOut;
    expect(true).toBe(true);
  });
});

describe('PrepareParams', () => {
  it('takes an asset-denominated amount', () => {
    const params: PrepareParams = { amount: '0.1', recipient: 'bc1q...' };
    expect(params.amount).toBe('0.1');
  });

  it('takes shares, which are not interchangeable with an amount', () => {
    const params: PrepareParams = { shares: shares('1000') };
    expect(params.shares).toBe('1000');

    // @ts-expect-error - share decimals are not asset decimals, so a bare
    // string must not pass where shares are expected.
    const bare: PrepareParams = { shares: '1000' };
    void bare;
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ActionResult: no status masquerading as a value
// ═══════════════════════════════════════════════════════════════════════════

describe('ActionResult', () => {
  // Returned from a function rather than assigned to an annotated const: a
  // const is narrowed to its initializer's arm by control flow, which would
  // make the negative case below compile for the wrong reason.
  function execute(): ActionResult {
    return { kind: 'tx', txHash: '0xabc' };
  }

  it('cannot be destructured for a txHash without narrowing', () => {
    const result = execute();

    // @ts-expect-error - the whole point: v5 let SANCTIONED_ADDRESS travel
    // where an address goes and 'ALREADY_MINTED' where a tx hash goes, so a
    // caller could read a status as a value.
    const { txHash } = result;
    void txHash;

    expect(isTxResult(result) && result.txHash).toBe('0xabc');
  });

  it('narrows to the address arm', () => {
    const result: ActionResult = {
      kind: 'address',
      depositAddress: 'bc1qxyz',
    };

    expect(isAddressResult(result)).toBe(true);
    expect(isTxResult(result)).toBe(false);
    if (isAddressResult(result)) {
      expect(result.depositAddress).toBe('bc1qxyz');
    }
  });

  it('carries a rejection as its own arm, not as an address', () => {
    const result: ActionResult = {
      kind: 'rejected',
      reason: 'sanctioned_address',
    };

    expect(isAddressResult(result)).toBe(false);
    expect(isTxResult(result)).toBe(false);
  });

  it('carries an already-settled operation as its own arm', () => {
    const result: ActionResult = { kind: 'already_settled' };

    expect(isTxResult(result)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B6: the (namespace, asset) to registry-token table
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The fund-relevant one.
 *
 * `AssetId.LBTC` and `Token.LBTC` are the same string. A BTC-source vault
 * deposit resolving to `'LBTC'` selects `identity` and authorises the raw
 * satoshi amount instead of dividing by the BTC/LBTC ratio. That is the one
 * wrong answer which type-checks.
 */
describe('resolveRegistryToken', () => {
  it('covers all four rows', () => {
    expect(REGISTRY_TOKEN_ROWS).toHaveLength(4);
  });

  it.each(REGISTRY_TOKEN_ROWS)(
    'resolves $namespace/$asset to $registryToken',
    ({ namespace, asset, registryToken }) => {
      expect(resolveRegistryToken(namespace, asset)).toBe(registryToken);
    },
  );

  it('resolves a BTC-source LBTC deploy to the virtual BTC key', () => {
    // Asserted separately from the table sweep, because this is the row whose
    // wrong answer moves money rather than throwing.
    expect(resolveRegistryToken('btc', AssetId.LBTC)).toBe('BTC');
    expect(resolveRegistryToken('btc', AssetId.LBTC)).not.toBe(Token.LBTC);
    expect(resolveRegistryToken('btc', AssetId.LBTC)).not.toBe('LBTC');
  });

  it('resolves an EVM LBTC deploy to the real LBTC key', () => {
    // The same asset, a different namespace, a different key. This is why the
    // resolution cannot come from the asset alone.
    expect(resolveRegistryToken('evm', AssetId.LBTC)).toBe(Token.LBTC);
  });

  it('gives the two namespaces different keys for the same asset', () => {
    expect(resolveRegistryToken('btc', AssetId.LBTC)).not.toBe(
      resolveRegistryToken('evm', AssetId.LBTC),
    );
  });

  it('gives BTC.b the same key in both namespaces, since it is 1:1', () => {
    expect(resolveRegistryToken('btc', AssetId.BTCb)).toBe(
      resolveRegistryToken('evm', AssetId.BTCb),
    );
  });

  it('rejects a namespace that cannot reach a vault', () => {
    expect(() =>
      // @ts-expect-error - solana has no vault route, and accepting it here
      // would mean guessing a key.
      resolveRegistryToken('solana', AssetId.LBTC),
    ).toThrow();
  });

  it('rejects an asset with no vault route', () => {
    expect(() =>
      // @ts-expect-error - BTC is not a registry input key. The btc namespace
      // resolves LBTC to the virtual 'BTC' key; AssetId.BTC itself is not a row.
      resolveRegistryToken('btc', AssetId.BTC),
    ).toThrow(/route table/);
  });
});
