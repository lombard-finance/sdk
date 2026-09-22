/**
 * `getErrorMessage` on the response bodies the gateway does not send.
 *
 * Its result is what every api-function throws, and what the two
 * deposit-address routes then run `.includes()` on to spot the sanctions
 * refusal. A body without a JSON `message` — an HTML page from an edge, an
 * empty 401 — used to yield `undefined` there.
 */

import { describe, expect, it } from 'vitest';

import { getErrorMessage } from '../../../utils/err';

/** An axios rejection: an Error carrying the response it failed with. */
function axiosLike(response: unknown, message = 'Request failed') {
  return Object.assign(new Error(message), { response });
}

describe('getErrorMessage', () => {
  it('quotes the message the gateway sent', () => {
    expect(
      getErrorMessage(
        axiosLike({ status: 400, data: { message: 'amount too small' } }),
      ),
    ).toBe('amount too small');
  });

  it.each([
    ['an HTML error page', '<html><body>502 Bad Gateway</body></html>'],
    ['an empty body', undefined],
    ['a null body', null],
    ['a body with no message', { code: 7, error: 'nope' }],
    ['a body whose message is empty', { message: '' }],
    ['a body whose message is not a string', { message: { nested: true } }],
  ])('describes the response for %s', (_label, data) => {
    const result = getErrorMessage(
      axiosLike({ status: 502, statusText: 'Bad Gateway', data }),
    );

    expect(typeof result).toBe('string');
    expect(result).toContain('502');
  });

  // The reason this matters: the deposit-address routes match a substring on
  // the result, so `undefined` threw a TypeError from inside their own error
  // handling and masked the branch that reports a rejected JWT.
  it('always returns something a caller can call includes on', () => {
    for (const data of [null, undefined, '', 0, [], { message: null }]) {
      const result = getErrorMessage(
        axiosLike({ status: 401, statusText: 'Unauthorized', data }),
      );
      expect(() => result.includes('sanctions')).not.toThrow();
    }
  });

  it('falls back to the error message when there is no response', () => {
    expect(getErrorMessage(new Error('socket hang up'))).toBe('socket hang up');
  });

  it('reports a status with no statusText', () => {
    expect(getErrorMessage(axiosLike({ status: 429, data: {} }))).toBe(
      'HTTP error 429',
    );
  });

  it('passes a string through', () => {
    expect(getErrorMessage('plain failure')).toBe('plain failure');
  });

  it('reads the data.message shape used by some callers', () => {
    expect(getErrorMessage({ data: { message: 'from data' } })).toBe(
      'from data',
    );
  });

  it('has something to say about an error it cannot read', () => {
    expect(getErrorMessage({ unexpected: true })).toBe('Unknown error');
  });
});
