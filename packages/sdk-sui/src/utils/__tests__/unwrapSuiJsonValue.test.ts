import { describe, expect, it } from 'vitest';

import { unwrapSuiJsonValue } from '../unwrapSuiJsonValue';
import { toProtoValue } from './protoValueFixture';

describe('unwrapSuiJsonValue', () => {
  it('unwraps the flat shapes the bascule reads depend on', () => {
    // The gRPC `json` rendering of the Bascule object, trimmed to the paths
    // the deposit-status read walks: Move structs come flattened, with no
    // `fields` level in between, a u64 arrives as a string, and a Move enum as
    // `{ "@variant": "Name" }`.
    const rendered = toProtoValue({
      mIsPaused: false,
      mDepositHistory: { id: '0xe0d3', size: '8697' },
      value: { '@variant': 'Reported' },
    });

    expect(unwrapSuiJsonValue(rendered)).toEqual({
      mIsPaused: false,
      mDepositHistory: { id: '0xe0d3', size: '8697' },
      value: { '@variant': 'Reported' },
    });
  });

  it('unwraps lists, numbers and nulls', () => {
    expect(unwrapSuiJsonValue(toProtoValue([true, null, 'a', 1]))).toEqual([
      true,
      null,
      'a',
      1,
    ]);
  });

  it('returns null for a missing or empty value', () => {
    expect(unwrapSuiJsonValue(undefined)).toBeNull();
    expect(unwrapSuiJsonValue({ kind: { oneofKind: undefined } })).toBeNull();
  });
});
