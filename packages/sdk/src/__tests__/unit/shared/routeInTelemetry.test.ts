/**
 * The route label has to reach telemetry, not just exist
 *
 * Every action exposes a `route` getter, and the conformance suite checks that
 * it does. That is not the same as it being useful: a getter nothing reads
 * cannot tell anyone which journey failed, and the design assumed it flowed into
 * logs and into `toSentryContext()` when in fact nothing wired it up.
 *
 * It matters because one class now covers several journeys. `EvmUnstake` runs
 * both `lbtc-to-btc` and `lbtc-to-btcb`; `BtcStake` feeds every destination
 * chain. So the class name in a log line no longer says what the line is about,
 * and an error captured without the route names the code path but not the
 * product flow.
 *
 * These pin the two places it has to arrive.
 */

import { describe, expect, it, vi } from 'vitest';

import { LombardError } from '../../../shared/errors';

/** Minimal action over `BaseAction`'s protected surface. */
async function buildAction(route: string | undefined) {
  const { BaseAction } = await import('../../../shared/actions/BaseAction');

  class TestAction extends (BaseAction as never as new (
    ...args: never[]
  ) => Record<string, unknown>) {
    get route() {
      if (route === undefined) {
        throw new Error('route is not derivable yet');
      }
      return route;
    }
  }

  return TestAction;
}

/**
 * `BaseAction`'s constructor wants a full context, so the parts under test are
 * exercised through a hand-built instance instead. `log` and `handleFailure`
 * only touch `logger`, `_status` and the route getter.
 */
function instanceWith(
  proto: object,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  return Object.assign(Object.create(proto), fields) as Record<string, unknown>;
}

describe('route in log lines', () => {
  it('is attached to every line the action logs', async () => {
    const TestAction = await buildAction('lbtc-to-btc');
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const action = instanceWith(TestAction.prototype, {
      logger,
      _status: 'idle',
    });

    (action.log as (l: string, m: string) => void).call(
      action,
      'info',
      'something happened',
    );

    expect(logger.info).toHaveBeenCalledWith(
      'something happened',
      expect.objectContaining({ route: 'lbtc-to-btc' }),
    );
  });

  it('still names the action and status', async () => {
    const TestAction = await buildAction('btcb-to-btc');
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const action = instanceWith(TestAction.prototype, {
      logger,
      _status: 'executing',
    });

    (action.log as (l: string, m: string) => void).call(action, 'info', 'x');

    expect(logger.info).toHaveBeenCalledWith(
      'x',
      expect.objectContaining({ status: 'executing', route: 'btcb-to-btc' }),
    );
  });

  /**
   * Some actions derive the route from parameters that only exist after
   * `prepare()`. A getter that throws while a log line is being built would
   * replace the real failure with its own, so the label is skipped instead.
   */
  it('logs without a route rather than failing, when none can be derived', async () => {
    const TestAction = await buildAction(undefined);
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const action = instanceWith(TestAction.prototype, {
      logger,
      _status: 'idle',
    });

    expect(() => {
      (action.log as (l: string, m: string) => void).call(
        action,
        'info',
        'still logged',
      );
    }).not.toThrow();

    expect(logger.info).toHaveBeenCalledWith(
      'still logged',
      expect.not.objectContaining({ route: expect.anything() }),
    );
  });
});

describe('route in the error context', () => {
  it('reaches toSentryContext, which is what a captured error carries', () => {
    const error = new LombardError('unknown-error' as never, 'boom').withContext(
      { route: 'lbtc-to-vault' },
    );

    expect(error.toSentryContext()).toMatchObject({ route: 'lbtc-to-vault' });
  });

  it('keeps the stack of the original failure', () => {
    const original = new LombardError('unknown-error' as never, 'boom');
    const enriched = original.withContext({ route: 'btc-to-lbtc' });

    // The useful frame is where it failed, not where the context was added.
    expect(enriched.stack).toBe(original.stack);
  });

  it('does not mutate the error it came from', () => {
    const original = new LombardError('unknown-error' as never, 'boom', {
      chain: 'ethereum',
    });
    original.withContext({ route: 'btc-to-lbtc' });

    expect(original.metadata).toEqual({ chain: 'ethereum' });
  });

  // The caller adding context knows less about the failure than whatever raised
  // it, so it must not overwrite what is already recorded.
  it('lets existing metadata win', () => {
    const error = new LombardError('unknown-error' as never, 'boom', {
      route: 'the-real-one',
    }).withContext({ route: 'guessed' });

    expect(error.metadata?.route).toBe('the-real-one');
  });
});

describe('the failure path attaches it', () => {
  /**
   * `withContext` being correct is not the same as the action using it. Dropping
   * the call from `handleFailure` broke nothing until this existed — the unit
   * above proved the method worked and nothing proved it was reached.
   */
  it('carries the route on the error it throws', async () => {
    const TestAction = await buildAction('lbtc-to-btcb');
    const action = instanceWith(TestAction.prototype, {
      logger: undefined,
      _status: 'idle',
      emitError: () => undefined,
      emitFailed: () => undefined,
    });

    const failure = new LombardError('unknown-error' as never, 'boom');

    expect(() => {
      (action.handleFailure as (e: unknown) => never).call(action, failure);
    }).toThrow(LombardError);

    try {
      (action.handleFailure as (e: unknown) => never).call(action, failure);
      expect.unreachable('handleFailure must rethrow');
    } catch (thrown) {
      expect((thrown as LombardError).metadata?.route).toBe('lbtc-to-btcb');
      expect((thrown as LombardError).toSentryContext()).toMatchObject({
        route: 'lbtc-to-btcb',
      });
    }
  });

  it('throws the error unchanged when no route can be derived', async () => {
    const TestAction = await buildAction(undefined);
    const action = instanceWith(TestAction.prototype, {
      logger: undefined,
      _status: 'idle',
      emitError: () => undefined,
      emitFailed: () => undefined,
    });

    const failure = new LombardError('unknown-error' as never, 'boom');

    try {
      (action.handleFailure as (e: unknown) => never).call(action, failure);
      expect.unreachable('handleFailure must rethrow');
    } catch (thrown) {
      // Same instance: nothing to add, so nothing is rebuilt.
      expect(thrown).toBe(failure);
    }
  });
});
