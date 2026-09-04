/**
 * Finding an account's public key without asking four times.
 *
 * `PUBLIC_KEY_GETTERS` lists one entrypoint per wallet family, and an account
 * contract has exactly one of them. The loop tried all four regardless, so
 * three calls per signature were certain refusals — against the same node that
 * was rate limiting, partly because of them.
 */

import { describe, expect, it, vi } from 'vitest';

import { getPublicKey } from './account';
import { StarknetChainId } from './chains';

const ACCOUNT =
  '0x03978c91b7d6d0d1e0d4a1ef44e5a9c0f0c4f5e6a7b8c9d0e1f2a3b4c5d6dea3';
const PUBKEY =
  '0x35d4b4b733309a7f9233b2161c380e40dd228d46a46fb730375b64e2fe70ea7';

/** A provider that answers on one entrypoint and refuses the rest. */
function providerAnsweringOn(entrypoint: string) {
  const callContract = vi.fn(async (req: { entrypoint: string }) => {
    if (req.entrypoint === entrypoint) return [PUBKEY];
    throw new Error(`no such entrypoint: ${req.entrypoint}`);
  });

  return {
    callContract,
    getChainId: async () => StarknetChainId.SN_SEPOLIA,
  } as unknown as Parameters<typeof getPublicKey>[1] & {
    callContract: typeof callContract;
  };
}

describe('getPublicKey', () => {
  it('stops at the getter that answers', async () => {
    // `public_key` is first in the list, so this is the one-call case.
    const provider = providerAnsweringOn('public_key');

    await expect(getPublicKey(ACCOUNT, provider)).resolves.toBe(PUBKEY);
    expect(provider.callContract).toHaveBeenCalledTimes(1);
  });

  it('stops as soon as a later getter answers', async () => {
    // `get_owner` is an Argent/Ready account, third in the list: two refusals
    // then the answer, and nothing after it.
    const provider = providerAnsweringOn('get_owner');

    await expect(getPublicKey(ACCOUNT, provider)).resolves.toBe(PUBKEY);
    expect(provider.callContract).toHaveBeenCalledTimes(3);
  });

  it('throws naming the account when no getter answers', async () => {
    const provider = providerAnsweringOn('nothing-matches-this');

    await expect(getPublicKey(ACCOUNT, provider)).rejects.toThrow();
    // All four tried, which is the only case where that is correct.
    expect(provider.callContract).toHaveBeenCalledTimes(4);
  });
});
