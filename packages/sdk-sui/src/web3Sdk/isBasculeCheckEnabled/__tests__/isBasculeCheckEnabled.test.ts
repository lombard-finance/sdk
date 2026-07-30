import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it, vi } from 'vitest';

import { getConfig } from '../../../const';
import { isBasculeCheckEnabled } from '../isBasculeCheckEnabled';

// ASCII bytes of "bascule_check", the vector<u8> dynamic-field key the treasury
// stores the flag under.
const FLAG_KEY = [98, 97, 115, 99, 117, 108, 101, 95, 99, 104, 101, 99, 107];

const makeClient = (response: unknown) =>
  ({
    getDynamicFieldObject: vi.fn().mockResolvedValue(response),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

const flagResponse = (value: unknown) => ({
  data: {
    content: {
      dataType: 'moveObject',
      fields: { name: FLAG_KEY, value },
    },
  },
});

describe('isBasculeCheckEnabled', () => {
  it('reads the flag from the env treasury under the vector<u8> key', async () => {
    const client = makeClient(flagResponse(true));

    await expect(
      isBasculeCheckEnabled({ client, env: Env.prod }),
    ).resolves.toBe(true);

    expect(client.getDynamicFieldObject).toHaveBeenCalledWith({
      parentId: getConfig(Env.prod).treasuryAddress,
      name: { type: 'vector<u8>', value: FLAG_KEY },
    });
  });

  it('returns false when the treasury has the check disabled', async () => {
    await expect(
      isBasculeCheckEnabled({ client: makeClient(flagResponse(false)) }),
    ).resolves.toBe(false);
  });

  it('throws when the treasury has no such field', async () => {
    const client = makeClient({
      data: null,
      error: { code: 'dynamicFieldNotFound' },
    });

    await expect(isBasculeCheckEnabled({ client })).rejects.toThrow(
      /no bascule_check flag/,
    );
  });

  it('throws when the field holds something other than a bool', async () => {
    await expect(
      isBasculeCheckEnabled({ client: makeClient(flagResponse('true')) }),
    ).rejects.toThrow(/invalid bascule_check flag/);
  });
});
