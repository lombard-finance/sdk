/**
 * Per-chain RPC URL map, keyed by numeric chain ID.
 *
 * Lives here rather than in a chain package because both sides of the module
 * boundary need it: the SDK declares its public defaults with this shape, and
 * `RegisterContext` carries consumer overrides in the same shape down to the
 * services that build read clients.
 */
export type TRpcUrlConfig = Record<number, string>;
