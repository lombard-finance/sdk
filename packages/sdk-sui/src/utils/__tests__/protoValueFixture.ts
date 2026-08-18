/**
 * Builds the protobuf-ts `google.protobuf.Value` oneof shape out of plain
 * JSON, the inverse of `unwrapSuiJsonValue`, so tests can hand a mocked
 * `ledgerService.getObject` the same shape the wire delivers.
 */
import type { ISuiProtoValue } from '../unwrapSuiJsonValue';

export function toProtoValue(json: unknown): ISuiProtoValue {
  if (json === null || json === undefined) {
    return { kind: { oneofKind: 'nullValue', nullValue: 0 } };
  }

  if (typeof json === 'number') {
    return { kind: { oneofKind: 'numberValue', numberValue: json } };
  }

  if (typeof json === 'string') {
    return { kind: { oneofKind: 'stringValue', stringValue: json } };
  }

  if (typeof json === 'boolean') {
    return { kind: { oneofKind: 'boolValue', boolValue: json } };
  }

  if (Array.isArray(json)) {
    return {
      kind: {
        oneofKind: 'listValue',
        listValue: { values: json.map(toProtoValue) },
      },
    };
  }

  return {
    kind: {
      oneofKind: 'structValue',
      structValue: {
        fields: Object.fromEntries(
          Object.entries(json as Record<string, unknown>).map(
            ([key, value]) => [key, toProtoValue(value)],
          ),
        ),
      },
    },
  };
}

/** An `RpcError`-shaped rejection for an object that is not there. */
export function notFoundError(): Error {
  return Object.assign(new Error('not found'), { code: 'NOT_FOUND' });
}
