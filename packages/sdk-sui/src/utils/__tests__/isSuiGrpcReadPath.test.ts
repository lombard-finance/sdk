/**
 * Covers the read/write split the gRPC failover keys off.
 *
 * The point of these cases is the default: an unrecognised path is a write, so
 * a method the proto gains later cannot quietly become retryable and put a
 * transaction on chain twice.
 */
import { describe, expect, it } from 'vitest';

import { isSuiGrpcReadPath } from '../isSuiGrpcReadPath';

/**
 * The path a submit actually goes out on today. Pinned here so a rename in a
 * later `@mysten/sui` fails this test rather than silently turning the submit
 * into something the failover is willing to retry.
 */
const SUBMIT_PATH =
  '/sui.rpc.v2.TransactionExecutionService/ExecuteTransaction';

describe('isSuiGrpcReadPath', () => {
  it.each([
    '/sui.rpc.v2.LedgerService/GetServiceInfo',
    '/sui.rpc.v2.LedgerService/GetTransaction',
    '/sui.rpc.v2.StateService/GetBalance',
    '/sui.rpc.v2.StateService/GetCoinInfo',
    '/sui.rpc.v2.StateService/ListDynamicFields',
    '/sui.rpc.v2.MovePackageService/GetPackage',
    '/sui.rpc.v2.NameService/LookupName',
    '/sui.rpc.v2.SignatureVerificationService/VerifySignature',
    // A dry run on the service that also submits.
    '/sui.rpc.v2.TransactionExecutionService/SimulateTransaction',
  ])('treats %s as a read', (path) => {
    expect(isSuiGrpcReadPath(path)).toBe(true);
  });

  it.each([
    SUBMIT_PATH,
    // An execution method under another name, which is the case the allowlist
    // exists for: guessing from the name would make it retryable.
    '/sui.rpc.v2.TransactionExecutionService/ExecuteTransactionAndWait',
    '/sui.rpc.v2.TransactionExecutionService/SubmitTransaction',
    // A service the proto could gain, on either the current package or a
    // rebranded one.
    '/sui.rpc.v2.TransactionSubmissionService/Submit',
    '/sui.rpc.v3.TransactionExecutionService/ExecuteTransaction',
    '/sui.forking.v1alpha.ForkingService/CreateFork',
    // Anything that is not a gRPC path at all.
    '/',
    '',
    '/GetServiceInfo',
    '/sui.rpc.v2.LedgerService/GetTransaction/extra',
  ])('treats %s as a write', (path) => {
    expect(isSuiGrpcReadPath(path)).toBe(false);
  });

  it('does not accept a read service as a prefix of another one', () => {
    // `sui.rpc.v2.LedgerServiceV2` is not `sui.rpc.v2.LedgerService`, and a
    // third-party package ending in the same name is not it either.
    expect(
      isSuiGrpcReadPath('/sui.rpc.v2.LedgerServiceV2/GetTransaction'),
    ).toBe(false);
    expect(
      isSuiGrpcReadPath('/evil.sui.rpc.v2.LedgerService/GetTransaction'),
    ).toBe(false);
  });
});
