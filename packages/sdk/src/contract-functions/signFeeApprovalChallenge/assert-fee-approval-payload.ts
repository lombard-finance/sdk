import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';

import type { ChainId } from '../../common/chains';
import {
  AddressKind,
  getTokenAddressForChain,
  Token,
} from '../../tokens/token-addresses';
import { FeeApprovalChallengeMismatchError } from '../../utils/err';
import { now, toUnix } from '../../utils/time';

/** The `feeApproval` struct `signNetworkFee` signs, field for field. */
const FEE_APPROVAL_TYPES = [
  { name: 'chainId', type: 'uint256' },
  { name: 'fee', type: 'uint256' },
  { name: 'expiry', type: 'uint256' },
] as const;

/** The tokens a fee approval can be signed against. */
export type FeeApprovalToken = typeof Token.LBTC | typeof Token.BTCb;

export interface ExpectedFeeApproval {
  /** The chain the caller asked for. */
  chainId: ChainId;
  /** The most the caller asked to approve per mint, in token base units. */
  maxMintFee: string;
  /** The expiry the caller asked for, as UNIX seconds. */
  expiry: number;
  /** The token the approval is for. Defaults to LBTC. */
  token?: FeeApprovalToken;
  /** The environment whose contract addresses apply. */
  env?: Env;
}

interface ParsedTypedData {
  domain?: { chainId?: unknown; verifyingContract?: unknown };
  types?: Record<string, unknown>;
  primaryType?: unknown;
  message?: Record<string, unknown>;
}

/**
 * Checks a server-issued fee-approval document against the values the caller
 * already holds, before the wallet is asked to sign it.
 *
 * The same reasoning as `assertPermitPayloadMatches`: the payload is built
 * server-side and signed as the exact string that arrived, and neither means
 * its contents are taken on trust. A digest check proves only that the
 * payload and the digest from one response agree with each other.
 *
 * Pinned: the primary type and the `feeApproval` struct, so the document
 * cannot be a permit or anything else under this name; `domain.chainId` and
 * `message.chainId`, to the chain asked for; `domain.verifyingContract`, to the
 * SDK's own address for the token; `message.fee`, above zero and at most the
 * fee asked for; and `message.expiry`, in the future and no later than asked.
 * The fee and expiry are bounded rather than matched, since the server may
 * lower either, and what matters is that the approval grants no more than was
 * requested.
 *
 * `domain.name` and `domain.version` are left alone: with the contract pinned,
 * a wrong string yields a signature that contract rejects, not an approval
 * for something else.
 *
 * @throws {FeeApprovalChallengeMismatchError} naming the field that differs.
 */
export function assertFeeApprovalPayloadMatches(
  payload: string,
  expected: ExpectedFeeApproval,
): void {
  const env = expected.env ?? DEFAULT_ENV;
  const token = expected.token ?? Token.LBTC;
  const typedData = parsePayload(payload);

  if (typedData.primaryType !== 'feeApproval') {
    throw new FeeApprovalChallengeMismatchError(
      'primaryType',
      `expected the challenge to be a feeApproval, got ` +
        `${describe(typedData.primaryType)}`,
    );
  }

  assertFeeApprovalTypes(typedData.types);

  const { domain = {}, message = {} } = typedData;

  const expectedContract = getTokenAddressForChain(
    expected.chainId,
    AddressKind.Token,
    env,
    token,
  );
  if (!expectedContract) {
    throw new FeeApprovalChallengeMismatchError(
      'domain.verifyingContract',
      `no ${token} address is known for chain ${String(expected.chainId)} ` +
        `in ${env}, so the contract the approval names cannot be checked`,
    );
  }

  const chainId = BigInt(expected.chainId);
  assertNumber('domain.chainId', domain.chainId, (v) => v === chainId, {
    expected: String(chainId),
  });
  if (
    typeof domain.verifyingContract !== 'string' ||
    domain.verifyingContract.toLowerCase() !== expectedContract.toLowerCase()
  ) {
    throw new FeeApprovalChallengeMismatchError(
      'domain.verifyingContract',
      `expected ${expectedContract}, got ${describe(domain.verifyingContract)}`,
    );
  }
  assertNumber('message.chainId', message.chainId, (v) => v === chainId, {
    expected: String(chainId),
  });

  const maxFee = BigInt(expected.maxMintFee);
  assertNumber('message.fee', message.fee, (v) => v > 0n && v <= maxFee, {
    expected: `a fee above zero and at most the requested ${String(maxFee)}`,
  });

  const nowSeconds = BigInt(toUnix(now()));
  const maxExpiry = BigInt(expected.expiry);
  assertNumber(
    'message.expiry',
    message.expiry,
    (v) => v > nowSeconds && v <= maxExpiry,
    {
      expected:
        `an expiry after now (${String(nowSeconds)}) and at most the ` +
        `requested ${String(maxExpiry)}`,
    },
  );
}

function parsePayload(payload: string): ParsedTypedData {
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('not an object');
    }
    return parsed as ParsedTypedData;
  } catch (error) {
    throw new FeeApprovalChallengeMismatchError(
      'payload',
      `could not be read as typed data: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/** The struct, field for field and in order, since the order is hashed. */
function assertFeeApprovalTypes(
  types: Record<string, unknown> | undefined,
): void {
  const declared = types?.feeApproval;
  const matches =
    Array.isArray(declared) &&
    declared.length === FEE_APPROVAL_TYPES.length &&
    FEE_APPROVAL_TYPES.every((field, index) => {
      const entry = declared[index] as { name?: unknown; type?: unknown };
      return entry?.name === field.name && entry?.type === field.type;
    });

  if (!matches) {
    throw new FeeApprovalChallengeMismatchError(
      'types.feeApproval',
      `expected the fields ` +
        `${FEE_APPROVAL_TYPES.map((f) => `${f.name}:${f.type}`).join(', ')}, ` +
        `got ${describe(declared)}`,
    );
  }
}

/** Numbers in a typed-data document arrive as either a string or a number. */
function assertNumber(
  field: string,
  actual: unknown,
  accept: (value: bigint) => boolean,
  { expected }: { expected: string },
): void {
  let value: bigint | undefined;
  if (typeof actual === 'string' || typeof actual === 'number') {
    try {
      value = BigInt(actual);
    } catch {
      value = undefined;
    }
  }

  if (value === undefined || !accept(value)) {
    throw new FeeApprovalChallengeMismatchError(
      field,
      `expected ${expected}, got ${describe(actual)}`,
    );
  }
}

function describe(value: unknown): string {
  return value === undefined ? 'nothing' : JSON.stringify(value);
}
