/**
 * The gRPC ledger service renders Move values as a `google.protobuf.Value`
 * when the read mask asks for `json`. That arrives as protobuf-ts oneof
 * wrappers (`{ kind: { oneofKind: 'structValue', ... } }`) rather than plain
 * JSON, and the generated message classes are not exported from
 * `@mysten/sui/grpc`, so the shape is declared structurally here and unwrapped
 * by hand.
 *
 * Note that unlike the JSON-RPC `showContent` rendering, nested Move structs
 * come flattened: no `fields` level in between. A `u64` arrives as a string,
 * and a Move enum as `{ "@variant": "Name", ...fields }`.
 *
 * @module utils/unwrapSuiJsonValue
 */

/** Structural stand-in for the generated `google.protobuf.Value` message. */
export interface ISuiProtoValue {
  kind:
    | { oneofKind: 'nullValue'; nullValue: number }
    | { oneofKind: 'numberValue'; numberValue: number }
    | { oneofKind: 'stringValue'; stringValue: string }
    | { oneofKind: 'boolValue'; boolValue: boolean }
    | {
        oneofKind: 'structValue';
        structValue: { fields: { [key: string]: ISuiProtoValue } };
      }
    | { oneofKind: 'listValue'; listValue: { values: ISuiProtoValue[] } }
    | { oneofKind: undefined };
}

export type TSuiJsonValue =
  | null
  | number
  | string
  | boolean
  | TSuiJsonValue[]
  | { [key: string]: TSuiJsonValue };

/**
 * Converts a proto `Value` into the plain JSON it represents.
 */
export function unwrapSuiJsonValue(
  value: ISuiProtoValue | undefined,
): TSuiJsonValue {
  const kind = value?.kind;

  switch (kind?.oneofKind) {
    case 'numberValue':
      return kind.numberValue;
    case 'stringValue':
      return kind.stringValue;
    case 'boolValue':
      return kind.boolValue;
    case 'structValue':
      return Object.fromEntries(
        Object.entries(kind.structValue.fields ?? {}).map(([key, field]) => [
          key,
          unwrapSuiJsonValue(field),
        ]),
      );
    case 'listValue':
      return (kind.listValue.values ?? []).map((item) =>
        unwrapSuiJsonValue(item),
      );
    default:
      return null;
  }
}
