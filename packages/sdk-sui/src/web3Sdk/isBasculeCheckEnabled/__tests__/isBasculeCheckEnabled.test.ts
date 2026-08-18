import { Env } from '@lombard.finance/sdk-common';
import { deriveDynamicFieldID } from '@mysten/sui/utils';
import { describe, expect, it, vi } from 'vitest';

import { getConfig } from '../../../const';
import {
  notFoundError,
  toProtoValue,
} from '../../../utils/__tests__/protoValueFixture';
import {
  basculeCheckFieldNameBcs,
  isBasculeCheckEnabled,
} from '../isBasculeCheckEnabled';

/**
 * BCS of the `bascule_check` key as a Move `vector<u8>`: the ULEB128 length 13,
 * then the ASCII bytes of the name. Written out by hand on purpose. Deriving it
 * from the implementation's own serializer would let a wrong key name or a
 * wrong encoding agree with itself, and every assertion below would pass while
 * the on-chain lookup missed the field.
 */
const FIELD_NAME_BCS = Uint8Array.from([
  13, 98, 97, 115, 99, 117, 108, 101, 95, 99, 104, 101, 99, 107,
]);

/** The id of the dynamic field object the flag lives in. */
const FLAG_FIELD_ID = deriveDynamicFieldID(
  getConfig(Env.prod).treasuryAddress,
  'vector<u8>',
  FIELD_NAME_BCS,
);

const makeClient = (getObject: ReturnType<typeof vi.fn>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ ledgerService: { getObject } }) as any;

const flagResponse = (value: unknown) => ({
  response: {
    object: {
      json: toProtoValue({ id: FLAG_FIELD_ID, name: 'x', value }),
    },
  },
});

describe('isBasculeCheckEnabled', () => {
  it('serializes the field key to the bytes the chain keys on', () => {
    // Everything else here is derived from FIELD_NAME_BCS, so this is what ties
    // the derivation to what the implementation actually sends.
    expect(Array.from(basculeCheckFieldNameBcs())).toEqual(
      Array.from(FIELD_NAME_BCS),
    );
  });

  it('reads the flag off the derived dynamic-field object id', async () => {
    const getObject = vi.fn().mockResolvedValue(flagResponse(true));

    await expect(
      isBasculeCheckEnabled({ client: makeClient(getObject), env: Env.prod }),
    ).resolves.toBe(true);

    expect(getObject).toHaveBeenCalledWith({
      objectId: FLAG_FIELD_ID,
      readMask: { paths: ['json'] },
    });
  });

  it('returns false when the treasury has the check disabled', async () => {
    const getObject = vi.fn().mockResolvedValue(flagResponse(false));

    await expect(
      isBasculeCheckEnabled({ client: makeClient(getObject), env: Env.prod }),
    ).resolves.toBe(false);
  });

  it('throws when the treasury has no such field', async () => {
    const getObject = vi.fn().mockRejectedValue(notFoundError());

    await expect(
      isBasculeCheckEnabled({ client: makeClient(getObject), env: Env.prod }),
    ).rejects.toThrow(/no bascule_check flag/);
  });

  it('throws when the field holds something other than a bool', async () => {
    const getObject = vi.fn().mockResolvedValue(flagResponse('true'));

    await expect(
      isBasculeCheckEnabled({ client: makeClient(getObject), env: Env.prod }),
    ).rejects.toThrow(/invalid bascule_check flag/);
  });

  it('surfaces a node failure rather than reading it as a missing flag', async () => {
    const getObject = vi.fn().mockRejectedValue(new Error('UNAVAILABLE'));

    await expect(
      isBasculeCheckEnabled({ client: makeClient(getObject), env: Env.prod }),
    ).rejects.toThrow('UNAVAILABLE');
  });
});
