/**
 * Dynamic-field reads over gRPC.
 *
 * JSON-RPC had `suix_getDynamicFieldObject`; over gRPC the field object id is
 * derived locally instead, exactly as the chain derives it, which turns the
 * lookup into a plain object read.
 *
 * @module utils/readSuiDynamicFieldValue
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { deriveDynamicFieldID } from '@mysten/sui/utils';

import { isGrpcNotFoundError } from './isGrpcNotFoundError';
import { TSuiJsonValue, unwrapSuiJsonValue } from './unwrapSuiJsonValue';

export interface IReadSuiDynamicFieldValueParams {
  client: SuiGrpcClient;
  /** The object holding the field: a treasury, a table, etc. */
  parentId: string;
  /** Move type of the field name, e.g. `vector<u8>` or `u256`. */
  nameType: string;
  /** BCS bytes of the field name value. */
  nameBcs: Uint8Array;
}

/**
 * Reads a dynamic field (`0x2::dynamic_field::Field<K, V>`) and returns the
 * node's JSON rendering of its `value`, or `undefined` when the parent has no
 * such field.
 *
 * The rendering is flat: nested Move structs carry no `fields` level, a `u64`
 * arrives as a string, and a Move enum as `{ "@variant": "Name", ...fields }`.
 */
export async function readSuiDynamicFieldValue({
  client,
  parentId,
  nameType,
  nameBcs,
}: IReadSuiDynamicFieldValueParams): Promise<TSuiJsonValue | undefined> {
  const fieldId = deriveDynamicFieldID(parentId, nameType, nameBcs);

  try {
    const { response } = await client.ledgerService.getObject({
      objectId: fieldId,
      readMask: { paths: ['json'] },
    });

    const field = unwrapSuiJsonValue(response.object?.json);

    if (field === null || typeof field !== 'object' || Array.isArray(field)) {
      return undefined;
    }

    return field.value;
  } catch (error) {
    if (isGrpcNotFoundError(error)) {
      return undefined;
    }

    throw error;
  }
}
