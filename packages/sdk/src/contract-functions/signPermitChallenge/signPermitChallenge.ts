import type { WalletVerifyResult } from '@lombard.finance/sdk-common';
import { WALLET_CHALLENGE_TYPE } from '@lombard.finance/sdk-common';
import type { Address, EIP1193Provider } from 'viem';
import { hashTypedData } from 'viem';

import { pollWalletVerification } from '../../api-functions/walletAuth/pollWalletVerification';
import { requestWalletChallenge } from '../../api-functions/walletAuth/requestWalletChallenge';
import { verifyWalletSignature } from '../../api-functions/walletAuth/verifyWalletSignature';
import { getLegacyChainNameById } from '../../common/blockchain-identifier';
import type { ChainId } from '../../common/chains';
import type { IEnvParam } from '../../common/parameters';
import { DAY, now, toUnix } from '../../utils/time';

/** Seven days, the deadline requested when the caller does not name one. */
const DEFAULT_PERMIT_DAYS = 7;

export interface ISignPermitChallengeParams extends IEnvParam {
  /** The account that owns the tokens and signs the permit. */
  account: Address;
  /** The chain the account and the token live on. */
  chainId: ChainId;
  /** An EIP-1193 provider for the account's wallet. */
  provider: EIP1193Provider;
  /** The amount to permit, in token base units (LBTC has 8 decimals). */
  value: string;
  /**
   * Requested permit deadline as an absolute UNIX timestamp in seconds.
   * Defaults to seven days out. The server may shorten it; the value it chose
   * is returned as `signatureExpiresAt`.
   */
  deadline?: number;
}

export interface ISignPermitChallengeResult extends WalletVerifyResult {
  /** The EIP-712 document that was signed, as the server issued it. */
  payload: string;
  /** The signature over `payload`. */
  signature: string;
  /**
   * When the permit itself expires, as chosen by the server. Distinct from
   * `expiresAt`, which is when the JWT expires.
   */
  signatureExpiresAt?: string;
}

/**
 * Signs a server-issued ERC-2612 permit and exchanges it for a wallet JWT.
 *
 * This is the whole authorisation step for stake-and-bake in one call. The
 * user signs **once**: the signature both proves control of the destination
 * address — which is what the JWT then attests, so it can be used to resolve a
 * BTC deposit address — and authorises the vault spender to pull their LBTC.
 * On success the server also records the permit for the claimer, so there is
 * no separate call to store it.
 *
 * The permit is built server-side. It reads `nonces(owner)` from the token and
 * picks the deadline, because a client-chosen nonce and a predictable deadline
 * are what make a published signature replayable. Do not assemble the typed
 * data locally.
 *
 * Two details this function exists to get right:
 *
 * - The payload is handed to the wallet as the exact string the server
 *   returned. It is the JSON the server hashed, and re-serialising it can
 *   change the digest that was reserved.
 * - `challengeType` is sent again on verify, because challenges are stored per
 *   address *and* type.
 *
 * @param {ISignPermitChallengeParams} parameters - The parameters.
 * @param {Address} parameters.account - The account that signs the permit.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {EIP1193Provider} parameters.provider - The EIP-1193 provider.
 * @param {string} parameters.value - Amount to permit, in token base units.
 * @param {number} parameters.deadline - Optional requested deadline, UNIX seconds.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<ISignPermitChallengeResult>} The JWT and the signed permit.
 *
 * @throws if the server issues a challenge of a different type, if the digest
 * it reserved does not match the payload it returned, or if verification fails.
 */
export async function signPermitChallenge({
  account,
  chainId,
  provider,
  value,
  deadline = toUnix(now() + DAY * DEFAULT_PERMIT_DAYS),
  env,
}: ISignPermitChallengeParams): Promise<ISignPermitChallengeResult> {
  const chain = getLegacyChainNameById(chainId);

  const challenge = await requestWalletChallenge({
    address: account,
    chain,
    challengeType: WALLET_CHALLENGE_TYPE.permit,
    permit: { value, deadline },
    env,
  });

  // A challenge whose params the gateway dropped comes back as the plain-text
  // terms-of-service message, which the wallet would happily sign and the
  // server would then refuse. Catching it here names the real fault.
  if (challenge.challengeType !== WALLET_CHALLENGE_TYPE.permit) {
    throw new Error(
      `Expected a permit challenge, got ${challenge.challengeType ?? 'none'}. ` +
        `The gateway may not be forwarding challenge_type.`,
    );
  }

  assertDigestMatches(challenge.payload, challenge.digest);

  // Signed as the exact string the server returned: viem's signTypedData takes
  // a structured object and re-serialises it, which is the one thing that can
  // move the digest off the reserved one.
  const signature = (await provider.request({
    method: 'eth_signTypedData_v4',
    params: [account, challenge.payload],
  } as unknown as Parameters<EIP1193Provider['request']>[0])) as string;

  if (typeof signature !== 'string' || !signature.startsWith('0x')) {
    throw new Error('Wallet returned no signature for the permit challenge');
  }

  const verified = await verifyWalletSignature({
    address: account,
    payload: challenge.payload,
    signature,
    chain,
    // Required: challenges are keyed by address and type together.
    challengeType: WALLET_CHALLENGE_TYPE.permit,
    env,
  });

  const token =
    verified.kind === 'complete'
      ? { jwt: verified.jwt, expiresAt: verified.expiresAt }
      : await pollWalletVerification({
          verificationId: verified.verificationId,
          env,
        });

  return {
    ...token,
    payload: challenge.payload,
    signature,
    ...(challenge.signatureExpiresAt
      ? { signatureExpiresAt: challenge.signatureExpiresAt }
      : {}),
  };
}

/**
 * Recomputes the EIP-712 digest from the payload and checks it against the one
 * the server reserved.
 *
 * A mismatch means the document the wallet is about to be shown is not the one
 * the server will verify against, so the signature would be rejected after the
 * user had already approved it. Better to fail before the prompt.
 *
 * Skipped when the server sends no digest, so an older gateway still works.
 */
function assertDigestMatches(payload: string, digest?: string): void {
  if (!digest) {
    return;
  }

  let local: string;
  try {
    const typedData = JSON.parse(payload) as {
      domain: Record<string, unknown>;
      types: Record<string, unknown>;
      primaryType: string;
      message: Record<string, unknown>;
    };

    // EIP712Domain is derived from `domain` by the hasher; leaving it in the
    // type map makes viem throw on a duplicate definition.
    const { EIP712Domain: _domainType, ...types } = typedData.types;

    local = hashTypedData({
      domain: typedData.domain,
      types,
      primaryType: typedData.primaryType,
      message: typedData.message,
    } as Parameters<typeof hashTypedData>[0]);
  } catch (error) {
    throw new Error(
      `Could not read the permit challenge payload: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (local.toLowerCase() !== digest.toLowerCase()) {
    throw new Error(
      `Permit challenge digest mismatch: server reserved ${digest}, payload hashes to ${local}`,
    );
  }
}
