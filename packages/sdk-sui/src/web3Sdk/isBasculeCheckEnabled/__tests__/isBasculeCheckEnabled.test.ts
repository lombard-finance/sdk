import { Env } from '@lombard.finance/sdk-common';
import { bcs } from '@mysten/sui/bcs';
import { deriveDynamicFieldID } from '@mysten/sui/utils';
import { describe, expect, it, vi } from 'vitest';

import { getConfig } from '../../../const';
import {
  notFoundError,
  toProtoValue,
} from '../../../utils/__tests__/protoValueFixture';
import { isBasculeCheckEnabled } from '../isBasculeCheckEnabled';

/**
 * The id of the dynamic field object the flag lives in, derived the same way
 * the implementation (and the chain) derives it: parent treasury, `vector<u8>`
 * key, ASCII bytes of "bascule_check".
 */
const FLAG_FIELD_ID = deriveDynamicFieldID(
  getConfig(Env.prod).treasuryAddress,
  'vector<u8>',
  bcs
    .vector(bcs.u8())
    .serialize(Array.from(new TextEncoder().encode('bascule_check')))
    .toBytes(),
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
