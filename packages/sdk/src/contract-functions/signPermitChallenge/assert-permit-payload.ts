import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import type { Address } from 'viem';

import type { ChainId } from '../../common/chains';
import { DefiProtocol } from '../../defi/defi-registry';
import {
  AddressKind,
  getTokenAddressForChain,
  Token,
} from '../../tokens/token-addresses';
import { PermitChallengeMismatchError } from '../../utils/err';
import { PERMIT_MESSAGE_TYPES } from '../signStakeAndBake/typed-data-builder';
import { getStakeAndBakeConfig } from '../signStakeAndBake/validation';

/** The shape a permit challenge payload has to parse into to be read at all. */
interface ParsedTypedData {
  domain?: {
    name?: unknown;
    version?: unknown;
    chainId?: unknown;
    verifyingContract?: unknown;
  };
  types?: Record<string, unknown>;
  primaryType?: unknown;
  message?: Record<string, unknown>;
}

export interface ExpectedPermit {
  /** The account the caller asked to permit from. */
  account: Address;
  /** The chain the caller asked for. */
  chainId: ChainId;
  /** The allowance the caller asked for, in token base units. */
  value: string;
  /** The deadline the caller asked for, as UNIX seconds. */
  deadline: number;
  /** The environment whose contract addresses apply. */
  env?: Env;
  /**
   * The spender to expect instead of the one in the registry. Only needed on a
   * chain the registry does not carry yet; without it such a chain is refused
   * rather than trusted.
   */
  expectedSpender?: Address;
}

/**
 * Checks a server-issued permit document against the values the caller already
 * holds, before the wallet is asked to sign it.
 *
 * The payload is assembled server-side on purpose — a client-chosen nonce and a
 * predictable deadline are what make a published signature replayable — and it
 * is signed as the exact string that arrived, because re-serialising it moves
 * the digest off the one the server reserved. Neither of those requires taking
 * the *contents* on trust, and the digest check alone cannot: it hashes the
 * server's payload and compares it to the server's digest, so it only proves
 * the two agree with each other.
 *
 * Every field below is one the caller either passed in or the SDK knows from a
 * local constant, so a document that differs is not a document the caller asked
 * for. `nonce` is the exception and stays unchecked: reading `nonces(owner)`
 * from the token would need an RPC round trip, and a nonce that is not the
 * current one produces a permit the token rejects rather than one that
 * authorises something else.
 *
 * `value` and `deadline` are bounded rather than matched exactly. The server is
 * documented to be allowed to shorten the deadline it was asked for, and the
 * property that matters for both is that the document authorises no more than
 * the caller requested.
 *
 * `domain.name` and `domain.version` are also left alone. Once
 * `verifyingContract` is pinned to the known token, a wrong domain string
 * produces a signature that token rejects, so it is a broken gateway rather
 * than a permit for something else — and pinning strings the contract may
 * change on an upgrade would break the flow for no gain.
 *
 * @throws {PermitChallengeMismatchError} naming the field that differs.
 */
export function assertPermitPayloadMatches(
  payload: string,
  expected: ExpectedPermit,
): void {
  const env = expected.env ?? DEFAULT_ENV;
  const typedData = parsePayload(payload);

  if (typedData.primaryType !== 'Permit') {
    throw new PermitChallengeMismatchError(
      'primaryType',
      `expected the challenge to be a Permit, got ` +
        `${describe(typedData.primaryType)}`,
    );
  }

  assertPermitTypes(typedData.types);

  const { domain = {}, message = {} } = typedData;

  const expectedToken = getTokenAddressForChain(
    expected.chainId,
    AddressKind.Token,
    env,
  );
  if (!expectedToken) {
    throw new PermitChallengeMismatchError(
      'domain.verifyingContract',
      `no LBTC address is known for chain ${String(expected.chainId)} in ` +
        `${env}, so the contract the permit names cannot be checked`,
    );
  }

  const spender = expected.expectedSpender ?? registrySpender(expected, env);

  assertNumericEquals(
    'domain.chainId',
    domain.chainId,
    BigInt(expected.chainId),
  );
  assertAddressEquals(
    'domain.verifyingContract',
    domain.verifyingContract,
    expectedToken,
  );
  assertAddressEquals('message.owner', message.owner, expected.account);
  assertAddressEquals('message.spender', message.spender, spender);
  assertAtMost('message.value', message.value, BigInt(expected.value));
  assertAtMost('message.deadline', message.deadline, BigInt(expected.deadline));
}

function registrySpender(expected: ExpectedPermit, env: Env): Address {
  // A chain the registry does not carry is refused rather than trusted: the
  // permit authorises the vault spender, and a spender the SDK cannot name is
  // one it cannot check. A caller on a gateway that runs ahead of the registry
  // passes `expectedSpender` instead.
  try {
    const { spenderContract } = getStakeAndBakeConfig(
      DefiProtocol.Veda,
      Token.LBTC,
      expected.chainId,
      env,
    );
    return spenderContract.address as Address;
  } catch {
    throw new PermitChallengeMismatchError(
      'message.spender',
      `cannot be checked: no vault spender is known for chain ` +
        `${String(expected.chainId)} in ${env}. Pass expectedSpender to name ` +
        `the spender this permit should authorise.`,
    );
  }
}

function parsePayload(payload: string): ParsedTypedData {
  try {
    return JSON.parse(payload) as ParsedTypedData;
  } catch (error) {
    throw new PermitChallengeMismatchError(
      'payload',
      `could not be read as JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Requires the `Permit` struct to be the ERC-2612 one, field for field and in
 * order, since the order is part of what EIP-712 hashes.
 *
 * Types the primary type does not reference are left alone. They cannot reach
 * the digest, so a gateway that declares an extra struct is not a mismatch.
 */
function assertPermitTypes(types: Record<string, unknown> | undefined): void {
  const permit = types?.Permit;
  if (!Array.isArray(permit)) {
    throw new PermitChallengeMismatchError(
      'types.Permit',
      'the challenge declares no Permit struct',
    );
  }

  const matches =
    permit.length === PERMIT_MESSAGE_TYPES.length &&
    PERMIT_MESSAGE_TYPES.every((field, index) => {
      const declared = permit[index] as { name?: unknown; type?: unknown };
      return declared?.name === field.name && declared?.type === field.type;
    });

  if (!matches) {
    throw new PermitChallengeMismatchError(
      'types.Permit',
      `expected the ERC-2612 fields ` +
        `${PERMIT_MESSAGE_TYPES.map((f) => `${f.name}:${f.type}`).join(', ')}, ` +
        `got ${JSON.stringify(permit)}`,
    );
  }
}

function assertAddressEquals(
  field: string,
  actual: unknown,
  expected: string,
): void {
  if (typeof actual !== 'string') {
    throw new PermitChallengeMismatchError(
      field,
      `expected the address ${expected}, got ${describe(actual)}`,
    );
  }

  // Checksum casing is not part of the address, so compare the bytes.
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new PermitChallengeMismatchError(
      field,
      `expected ${expected}, got ${actual}`,
    );
  }
}

function assertNumericEquals(
  field: string,
  actual: unknown,
  expected: bigint,
): void {
  const parsed = toBigInt(field, actual, expected);
  if (parsed !== expected) {
    throw new PermitChallengeMismatchError(
      field,
      `expected ${String(expected)}, got ${String(parsed)}`,
    );
  }
}

function assertAtMost(field: string, actual: unknown, limit: bigint): void {
  const parsed = toBigInt(field, actual, limit);
  if (parsed > limit) {
    throw new PermitChallengeMismatchError(
      field,
      `expected at most the requested ${String(limit)}, got ${String(parsed)}`,
    );
  }
}

/** Numbers in a typed-data document arrive as either a string or a number. */
function toBigInt(field: string, actual: unknown, expected: bigint): bigint {
  if (typeof actual !== 'string' && typeof actual !== 'number') {
    throw new PermitChallengeMismatchError(
      field,
      `expected ${String(expected)}, got ${describe(actual)}`,
    );
  }

  try {
    return BigInt(actual);
  } catch {
    throw new PermitChallengeMismatchError(
      field,
      `expected ${String(expected)}, got the non-integer ${describe(actual)}`,
    );
  }
}

function describe(value: unknown): string {
  return value === undefined ? 'nothing' : JSON.stringify(value);
}
