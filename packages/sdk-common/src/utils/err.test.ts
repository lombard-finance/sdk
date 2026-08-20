/**
 * Error message extraction
 *
 * This is what every surfaced error message passes through, so an untested
 * branch here shows up as a user reading "Unknown error" instead of the reason
 * their transaction failed. The precedence between the branches is asserted
 * explicitly, because several of them can match the same object.
 */

import { describe, expect, it } from 'vitest';

import { extractErrorMessage } from './err';

/** An object shaped like the axios error the function sniffs for. */
function axiosError(overrides: Record<string, unknown> = {}): unknown {
  return Object.assign(new Error('request failed'), {
    isAxiosError: true,
    ...overrides,
  });
}

describe('extractErrorMessage', () => {
  it('returns a string unchanged', () => {
    expect(extractErrorMessage('plain failure')).toBe('plain failure');
  });

  it('returns an empty string unchanged rather than falling through', () => {
    expect(extractErrorMessage('')).toBe('');
  });

  it('reads an Error message', () => {
    expect(extractErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('reads a nested data.message, the API error shape', () => {
    expect(extractErrorMessage({ data: { message: 'rejected by node' } })).toBe(
      'rejected by node',
    );
  });

  it('reads a bare message property', () => {
    expect(extractErrorMessage({ message: 'no funds' })).toBe('no funds');
  });

  it('serialises an object with no message', () => {
    expect(extractErrorMessage({ code: 42, reason: 'nope' })).toBe(
      '{"code":42,"reason":"nope"}',
    );
  });

  it('falls back for a circular object', () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;

    expect(extractErrorMessage(circular)).toBe('Unknown error object');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
    ['a boolean', false],
  ])('returns the generic message for %s', (_label, value) => {
    expect(extractErrorMessage(value)).toBe('Unknown error');
  });

  // data.message is checked before `instanceof Error`, so an Error carrying a
  // data payload reports the payload rather than its own message.
  it('prefers data.message over an Error message', () => {
    const error = Object.assign(new Error('outer'), {
      data: { message: 'inner' },
    });

    expect(extractErrorMessage(error)).toBe('inner');
  });

  it('ignores a non-string data.message and uses the Error message', () => {
    const error = Object.assign(new Error('outer'), { data: { message: 99 } });

    expect(extractErrorMessage(error)).toBe('outer');
  });

  it('ignores a null data and uses the Error message', () => {
    const error = Object.assign(new Error('outer'), { data: null });

    expect(extractErrorMessage(error)).toBe('outer');
  });
});

describe('extractErrorMessage on axios errors', () => {
  it('prefers the response body message', () => {
    expect(
      extractErrorMessage(
        axiosError({ response: { data: { message: 'quota exceeded' } } }),
      ),
    ).toBe('quota exceeded');
  });

  it('serialises a response body with no message', () => {
    expect(
      extractErrorMessage(
        axiosError({ response: { data: { code: 'E_NOPE' } } }),
      ),
    ).toBe('{"code":"E_NOPE"}');
  });

  it('falls back to status and statusText for a non-object body', () => {
    expect(
      extractErrorMessage(
        axiosError({
          response: { data: 'oops', status: 503, statusText: 'Unavailable' },
        }),
      ),
    ).toBe('HTTP error 503: Unavailable');
  });

  it('falls back to status and statusText for a null body', () => {
    expect(
      extractErrorMessage(
        axiosError({
          response: { data: null, status: 500, statusText: 'Server Error' },
        }),
      ),
    ).toBe('HTTP error 500: Server Error');
  });

  it('uses the error message when there is no response, as on a timeout', () => {
    expect(
      extractErrorMessage(axiosError({ message: 'timeout of 5000ms' })),
    ).toBe('timeout of 5000ms');
  });

  it('reports a network error when there is no response and no message', () => {
    expect(extractErrorMessage(axiosError({ message: '' }))).toBe(
      'Network error',
    );
  });

  it('is not treated as an axios error when the flag is false', () => {
    const error = Object.assign(new Error('regular'), {
      isAxiosError: false,
      response: { data: { message: 'ignored' } },
    });

    expect(extractErrorMessage(error)).toBe('regular');
  });
});
