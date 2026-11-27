/**
 * The transport surfaces a missing object or record as an `RpcError` whose
 * code is the gRPC status name. Anything else stays a real error: an
 * unreachable node and a record that is not there must not read the same.
 *
 * @module utils/isGrpcNotFoundError
 */
export function isGrpcNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'NOT_FOUND'
  );
}
