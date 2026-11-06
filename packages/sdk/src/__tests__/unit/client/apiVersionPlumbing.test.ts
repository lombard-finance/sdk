/**
 * `apiVersion` set on the documented path, `createLombardSDK(options)`, has to
 * reach `sdk.api`. That path runs the options through `createConfig`, which
 * builds a fresh object and copies each field deliberately, so a field missing
 * from the copy is accepted by the type and silently dropped.
 */
import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { createLombardSDK } from '../../../client/createLombardSDK';

describe('apiVersion', () => {
  it('reaches sdk.api through createLombardSDK', async () => {
    const sdk = await createLombardSDK({
      env: Env.prod,
      providers: {},
      apiVersion: 'v2',
    });

    expect(sdk.api.getApiVersion()).toBe('v2');
  });

  it('defaults to v1', async () => {
    const sdk = await createLombardSDK({ env: Env.prod, providers: {} });

    expect(sdk.api.getApiVersion()).toBe('v1');
  });
});
