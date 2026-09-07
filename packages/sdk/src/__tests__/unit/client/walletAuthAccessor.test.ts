/**
 * `sdk.walletAuth`
 *
 * `walletAuthModule`'s own `@example` reads `sdk.walletAuth.requestChallenge(…)`
 * and the design assumes the same accessor, but no such property existed — the
 * service was only reachable as `capabilities.require('walletAuth')`. A
 * documented call that cannot be made is worse than an undocumented one, so the
 * accessor now exists and this pins it.
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { createLombardSDK } from '../../../client/createLombardSDK';
import type { AnyModule } from '../../../modules';
import { walletAuthModule } from '../../../modules/walletAuthModule';

/**
 * The chain modules the SDK requires at construction. Stubbed because this
 * asserts on one accessor, not on anything a chain service does.
 */
function chainStubs(): readonly AnyModule[] {
  return (['api', 'btc', 'evm', 'solana', 'sui', 'starknet'] as const).map(
    (id) => ({ id, register: () => ({}) }) as unknown as AnyModule,
  );
}

const base = { env: Env.prod, providers: {} } as const;

describe('sdk.walletAuth', () => {
  it('is the service when the module is registered', async () => {
    const sdk = await createLombardSDK({
      ...base,
      modules: [...chainStubs(), walletAuthModule()],
    });

    expect(sdk.walletAuth).not.toBeNull();
    expect(typeof sdk.walletAuth?.requestChallenge).toBe('function');
    expect(typeof sdk.walletAuth?.verifySignature).toBe('function');
    expect(typeof sdk.walletAuth?.pollVerification).toBe('function');
    expect(typeof sdk.walletAuth?.revokeToken).toBe('function');
  });

  // Acquiring a token is optional: a consumer that only reads public data never
  // needs one, so a missing module is null rather than a throw.
  it('is null when the module is not registered', async () => {
    const sdk = await createLombardSDK({ ...base, modules: chainStubs() });

    expect(sdk.walletAuth).toBeNull();
  });

  it('is the same instance the capability registry holds', async () => {
    const sdk = await createLombardSDK({
      ...base,
      modules: [...chainStubs(), walletAuthModule()],
    });

    expect(sdk.walletAuth).toBe(sdk.capabilities.require('walletAuth'));
  });
});
