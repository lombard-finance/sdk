/**
 * How the store route reports a signature that already exists.
 *
 * One live stake-and-bake signature is kept per wallet and chain while it is
 * unexpired and unused, so a second one is refused. That refusal reached
 * callers as a bare `Error` carrying the server's own string, which a UI can
 * only show verbatim to someone who has just signed in their wallet.
 *
 * The predicate and the message it recognises were written in
 * `ExistingSignatureHandling.test.ts`, declared inside the test rather than
 * imported, next to a comment saying the SDK should be doing this. These drive
 * the real thing.
 */

import { Env } from '@lombard.finance/sdk-common';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isActiveSignatureError,
  StakeAndBakeSignatureExistsError,
  storeStakeAndBakeSignature,
} from '../../../api-functions/storeStakeAndBakeSignature/storeStakeAndBakeSignature';

vi.mock('axios');

const mockedPost = vi.mocked(axios.post);
const mockedIsAxiosError = vi.mocked(axios.isAxiosError);

const params = {
  signature: '0xsignature',
  typedData: '{"primaryType":"Permit"}',
  env: Env.prod,
};

/** An axios rejection carrying the gateway's JSON body. */
function refusal(message: string, code?: number) {
  return Object.assign(new Error('Request failed with status code 409'), {
    isAxiosError: true,
    response: { status: 409, data: { message, ...(code ? { code } : {}) } },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockedIsAxiosError.mockImplementation(
    (error: unknown): boolean =>
      Boolean(error) &&
      typeof error === 'object' &&
      'isAxiosError' in (error as object),
  );
});

describe('isActiveSignatureError', () => {
  it.each([
    'stake and bake signature already exists',
    'Stake And Bake Signature Already Exists',
    'Active signature already exists for this user',
    'Signature already exists for address 0x123',
    'existing stake found',
    'pending stake already exists',
  ])('recognises %s', (message) => {
    expect(isActiveSignatureError(message)).toBe(true);
  });

  it.each([
    'Network timeout',
    'Invalid address',
    'HTTP error 502 Bad Gateway',
    '',
  ])('does not recognise %s', (message) => {
    expect(isActiveSignatureError(message)).toBe(false);
  });
});

describe('storeStakeAndBakeSignature', () => {
  it('returns the status on success', async () => {
    mockedPost.mockResolvedValue({ data: { status: 'success' } });

    await expect(storeStakeAndBakeSignature(params)).resolves.toBe('success');
  });

  it('throws a typed error when a signature already exists', async () => {
    mockedPost.mockRejectedValue(
      refusal('stake and bake signature already exists'),
    );

    await expect(storeStakeAndBakeSignature(params)).rejects.toBeInstanceOf(
      StakeAndBakeSignatureExistsError,
    );
  });

  it('carries the API code when the response had one', async () => {
    mockedPost.mockRejectedValue(
      refusal('stake and bake signature already exists', 6),
    );

    await expect(storeStakeAndBakeSignature(params)).rejects.toMatchObject({
      name: 'StakeAndBakeSignatureExistsError',
      code: 6,
    });
  });

  // The code this route answers with is not established, so recognition is by
  // message and a missing code is not a reason to miss the case.
  it('recognises the refusal with no code at all', async () => {
    mockedPost.mockRejectedValue(
      refusal('Active signature already exists for this user'),
    );

    const caught = await storeStakeAndBakeSignature(params).catch(
      (error: unknown) => error,
    );

    expect(caught).toBeInstanceOf(StakeAndBakeSignatureExistsError);
    expect((caught as StakeAndBakeSignatureExistsError).code).toBeUndefined();
  });

  it('leaves an unrelated failure as an ordinary error', async () => {
    mockedPost.mockRejectedValue(refusal('destination chain not supported'));

    const caught = await storeStakeAndBakeSignature(params).catch(
      (error: unknown) => error,
    );

    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(StakeAndBakeSignatureExistsError);
    expect(String(caught)).toContain('destination chain not supported');
  });

  it('leaves a transport failure as an ordinary error', async () => {
    mockedPost.mockRejectedValue(new Error('socket hang up'));

    await expect(storeStakeAndBakeSignature(params)).rejects.not.toBeInstanceOf(
      StakeAndBakeSignatureExistsError,
    );
  });
});
