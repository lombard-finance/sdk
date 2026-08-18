/**
 * Tells a read apart from a state change by its gRPC request path.
 *
 * gRPC puts the method in the path, `/<package>.<Service>/<Method>`, so unlike
 * JSON-RPC there is no header to consult. Only a read may be re-sent to another
 * node, so the failover in {@link module:utils/createSuiGrpcClient} asks here.
 *
 * The two mistakes do not cost the same. A read taken for a write only loses
 * failover; a write taken for a read can put the same transaction on chain
 * twice. Sui dedupes by transaction digest, so a resend is usually harmless,
 * but the harmful case is real: a node that took the transaction and then
 * failed to answer in time would have the next node's rejection reported for
 * one that actually landed.
 *
 * So this is an allowlist, and anything unrecognised — a service added to the
 * proto, an execution method renamed in a later API version — counts as a
 * write.
 *
 * @module utils/isSuiGrpcReadPath
 */

/** Services whose every method is a read. */
const READ_SERVICES = [
  'sui.rpc.v2.LedgerService',
  'sui.rpc.v2.StateService',
  'sui.rpc.v2.MovePackageService',
  'sui.rpc.v2.NameService',
  'sui.rpc.v2.SignatureVerificationService',
];

/**
 * Reads on a service that also writes. `TransactionExecutionService` carries
 * both `SimulateTransaction`, which changes nothing, and `ExecuteTransaction`,
 * which submits, so it is listed per method: a method added to it later is a
 * write until someone says otherwise here.
 */
const READ_METHODS = [
  'sui.rpc.v2.TransactionExecutionService/SimulateTransaction',
];

/** The only shape a gRPC request path takes. */
const GRPC_PATH = /^\/([\w.]+)\/(\w+)$/;

/**
 * Whether the call at this path can be retried on another node.
 *
 * @param path - Request path, `/<package>.<Service>/<Method>`
 */
export function isSuiGrpcReadPath(path: string): boolean {
  const parsed = GRPC_PATH.exec(path);

  if (!parsed) {
    return false;
  }

  const [, service, method] = parsed;

  return (
    READ_SERVICES.includes(service) ||
    READ_METHODS.includes(`${service}/${method}`)
  );
}
