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
});

describe('getBasculeDepositStatus', () => {
  const makeClient = (overrides: {
    paused?: boolean;
    tableId?: string;
    variant?: string | null;
  }) =>
    ({
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
      getDynamicFieldObject: vi.fn().mockResolvedValue(
        overrides.variant
          ? {
              data: {
                content: {
                  dataType: 'moveObject',
                  fields: { value: { variant: overrides.variant } },
                },
              },
            }
          : { data: null, error: { code: 'dynamicFieldNotFound' } },
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

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
    expect(client.getDynamicFieldObject).not.toHaveBeenCalled();
  });
});
