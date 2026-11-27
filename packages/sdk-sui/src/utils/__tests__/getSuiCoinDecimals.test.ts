/**
 * Covers the decimals lookup and the one fallback it allows.
 *
 * A wrong number here scales every balance and every amount by a power of ten,
 * so the cases that matter are the ones where metadata is missing.
 */
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { describe, expect, it, vi } from 'vitest';

import { LBTC_DECIMALS } from '../../const';
import {
  getSuiCoinDecimals,
  resolveSuiCoinDecimals,
} from '../getSuiCoinDecimals';

const LBTC_TYPE =
  '0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC';
const OTHER_TYPE = '0x2::sui::SUI';

/** An `RpcError` as the transport surfaces one: the status name in `code`. */
function rpcError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

/** A client whose only job is to answer `getCoinInfo` the way the test wants. */
function clientAnswering(answer: () => unknown): SuiGrpcClient {
  return {
    stateService: {
      getCoinInfo: vi.fn().mockImplementation(async () => answer()),
    },
  } as unknown as SuiGrpcClient;
}

const clientReturning = (metadata: { decimals?: number } | undefined) =>
  clientAnswering(() => ({ response: { metadata } }));

const clientThrowing = (code: string) =>
  clientAnswering(() => {
    throw rpcError(code);
  });

describe('getSuiCoinDecimals', () => {
  it('returns the decimals from the coin metadata', async () => {
    const decimals = await getSuiCoinDecimals(
      clientReturning({ decimals: 9 }),
      OTHER_TYPE,
    );

    expect(decimals).toBe(9);
  });

  it.each([
    ['the metadata is absent', clientReturning(undefined)],
    ['the coin has no record', clientThrowing('NOT_FOUND')],
  ])('returns undefined when %s', async (_case, client) => {
    expect(await getSuiCoinDecimals(client, LBTC_TYPE)).toBeUndefined();
  });

  it.each(['UNAVAILABLE', 'INTERNAL', 'PERMISSION_DENIED'])(
    'rethrows a %s, which is the node failing rather than an answer',
    async (code) => {
      await expect(
        getSuiCoinDecimals(clientThrowing(code), LBTC_TYPE),
      ).rejects.toThrow(code);
    },
  );
});

describe('resolveSuiCoinDecimals', () => {
  it('prefers the published metadata over the fallback', async () => {
    // Even for LBTC: the chain is the authority, the constant is the stopgap.
    const decimals = await resolveSuiCoinDecimals(
      clientReturning({ decimals: 6 }),
      LBTC_TYPE,
    );

    expect(decimals).toBe(6);
  });

  it.each([
    ['no metadata is published', clientReturning(undefined)],
    ['the coin has no metadata record', clientThrowing('NOT_FOUND')],
    ['the metadata carries no decimals', clientReturning({})],
  ])('falls back to LBTC decimals for LBTC when %s', async (_case, client) => {
    expect(await resolveSuiCoinDecimals(client, LBTC_TYPE)).toBe(LBTC_DECIMALS);
  });

  it.each([
    ['no metadata is published', clientReturning(undefined)],
    ['the coin has no metadata record', clientThrowing('NOT_FOUND')],
  ])('throws for any other coin when %s', async (_case, client) => {
    // Assuming eight decimals for a coin that does not have them would put the
    // amount out by a power of ten with nothing on screen to say so.
    await expect(resolveSuiCoinDecimals(client, OTHER_TYPE)).rejects.toThrow(
      'Coin Metadata could not be found.',
    );
  });

  it('does not take a coin merely ending in LBTC for LBTC', async () => {
    await expect(
      resolveSuiCoinDecimals(
        clientReturning(undefined),
        '0xdead::wrapped_lbtc::LBTC',
      ),
    ).rejects.toThrow('Coin Metadata could not be found.');
  });
});
