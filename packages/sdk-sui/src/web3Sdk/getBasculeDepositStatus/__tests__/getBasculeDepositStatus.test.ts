import { describe, expect, it, vi } from 'vitest';

import {
  deriveDepositId,
  getBasculeDepositStatus,
  SuiBasculeDepositStatus,
} from '../getBasculeDepositStatus';

// A synthetic mint payload: 4-byte selector + 5 big-endian 32-byte words
// (to_chain, recipient, amount=100000, tx_id, vout=3). The expected deposit id
// is computed independently (pure-python keccak mirroring Move's to_deposit_id
// and sui-claimer's payload.go) and pinned here as a regression vector.
const PAYLOAD =
  'ce25e7c2' +
  '0000000000000000000000000000000000000000000000000000000000000001' + // to_chain
  'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1' + // recipient
  '00000000000000000000000000000000000000000000000000000000000186a0' + // amount = 100000
  'b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2' + // tx_id
  '0000000000000000000000000000000000000000000000000000000000000003'; // vout = 3

const EXPECTED_DEPOSIT_ID =
  '103946673116742332945389452905418796987698243721899433814538596425314178876115';

describe('deriveDepositId', () => {
  it('matches the on-chain to_deposit_id derivation', () => {
    expect(deriveDepositId(PAYLOAD)).toBe(EXPECTED_DEPOSIT_ID);
  });

  it('accepts a 0x-prefixed payload', () => {
    expect(deriveDepositId(`0x${PAYLOAD}`)).toBe(EXPECTED_DEPOSIT_ID);
  });

  it('rejects a payload of the wrong length', () => {
    expect(() => deriveDepositId('ce25e7c2')).toThrow(/length/);
  });

  it('rejects a payload with non-hex characters', () => {
    // Correct length, but the final byte 'ag' has a non-hex low nibble.
    // Number.parseInt used to accept this as 0x0a; strict validation rejects it.
    expect(() => deriveDepositId(`${PAYLOAD.slice(0, -2)}ag`)).toThrow(
      /non-hex/,
    );
  });
});

describe('getBasculeDepositStatus', () => {
  const NOT_FOUND = { data: null, error: { code: 'dynamicFieldNotFound' } };

  /** The deposit-table lookups a client received, keyed apart by the u256 key. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const depositLookups = (client: any) =>
    client.getDynamicFieldObject.mock.calls.filter(
      ([{ name }]: [{ name: { type: string } }]) => name.type === 'u256',
    );

  const makeClient = (overrides: {
    paused?: boolean;
    tableId?: string;
    variant?: string | null;
    basculeCheck?: boolean | null;
  }) => {
    const deposit = overrides.variant
      ? {
          data: {
            content: {
              dataType: 'moveObject',
              fields: { value: { variant: overrides.variant } },
            },
          },
        }
      : NOT_FOUND;

    // `null` means the treasury has no such field at all.
    const basculeCheck =
      overrides.basculeCheck === undefined ? true : overrides.basculeCheck;
    const flag =
      basculeCheck === null
        ? NOT_FOUND
        : {
            data: {
              content: {
                dataType: 'moveObject',
                fields: { value: basculeCheck },
              },
            },
          };

    return {
      getObject: vi.fn().mockResolvedValue({
        data: {
          content: {
            dataType: 'moveObject',
            fields: {
              mIsPaused: overrides.paused ?? false,
              mDepositHistory: {
                fields: { id: { id: overrides.tableId ?? '0xtable' } },
              },
            },
          },
        },
      }),
      // The treasury bascule_check flag and the deposit entry are both dynamic
      // fields, told apart by the key type: vector<u8> for the flag, u256 for
      // the deposit id.
      getDynamicFieldObject: vi
        .fn()
        .mockImplementation(({ name }: { name: { type: string } }) =>
          Promise.resolve(name.type === 'vector<u8>' ? flag : deposit),
        ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  };

  it('returns REPORTED for a reported deposit', async () => {
    const status = await getBasculeDepositStatus({
      client: makeClient({ variant: 'Reported' }),
      payload: PAYLOAD,
    });
    expect(status).toBe(SuiBasculeDepositStatus.REPORTED);
  });

  it('returns WITHDRAWN for an already-withdrawn deposit', async () => {
    const status = await getBasculeDepositStatus({
      client: makeClient({ variant: 'Withdrawn' }),
      payload: PAYLOAD,
    });
    expect(status).toBe(SuiBasculeDepositStatus.WITHDRAWN);
  });

  it('returns UNREPORTED when the deposit is not in the table', async () => {
    const status = await getBasculeDepositStatus({
      client: makeClient({ variant: null }),
      payload: PAYLOAD,
    });
    expect(status).toBe(SuiBasculeDepositStatus.UNREPORTED);
  });

  it('returns PAUSED without looking up the deposit when paused', async () => {
    const client = makeClient({ paused: true, variant: 'Reported' });
    const status = await getBasculeDepositStatus({ client, payload: PAYLOAD });
    expect(status).toBe(SuiBasculeDepositStatus.PAUSED);
    expect(depositLookups(client)).toHaveLength(0);
  });

  it('returns NOT_ENFORCED without reading the bascule when the treasury has the check disabled', async () => {
    // mint_v2 skips validate_withdrawal entirely, so an unreported deposit
    // still mints and must not be gated here.
    const client = makeClient({
      basculeCheck: false,
      paused: true,
      variant: null,
    });
    const status = await getBasculeDepositStatus({ client, payload: PAYLOAD });
    expect(status).toBe(SuiBasculeDepositStatus.NOT_ENFORCED);
    expect(client.getObject).not.toHaveBeenCalled();
  });

  it('rejects a malformed payload even when the check is disabled', async () => {
    const client = makeClient({ basculeCheck: false, variant: 'Reported' });
    await expect(
      getBasculeDepositStatus({ client, payload: 'ce25e7c2' }),
    ).rejects.toThrow(/length/);
  });

  it('throws when the treasury has no bascule check flag', async () => {
    const client = makeClient({ basculeCheck: null, variant: 'Reported' });
    await expect(
      getBasculeDepositStatus({ client, payload: PAYLOAD }),
    ).rejects.toThrow(/no bascule_check flag/);
  });
});
