import type { WalletVerifyResult } from '@lombard.finance/sdk-common';
import {
  DEFAULT_ENV,
  WALLET_CHALLENGE_TYPE,
} from '@lombard.finance/sdk-common';
import type { Address, EIP1193Provider } from 'viem';

import { pollWalletVerification } from '../../api-functions/walletAuth/pollWalletVerification';
import { requestWalletChallenge } from '../../api-functions/walletAuth/requestWalletChallenge';
import { verifyWalletSignature } from '../../api-functions/walletAuth/verifyWalletSignature';
import { getLegacyChainNameById } from '../../common/blockchain-identifier';
import type { ChainId } from '../../common/chains';
import type { IEnvParam } from '../../common/parameters';
import {
  assertMintingFeeWithinBounds,
  assertValidExpiry,
} from '../../shared/validation/signing';
import {
  AddressKind,
  getTokenAddressForChain,
  Token,
} from '../../tokens/token-addresses';
import { getErrorMessage } from '../../utils/err';
import { DAY, now, toUnix } from '../../utils/time';
import { assertDigestMatches } from '../signPermitChallenge/signPermitChallenge';
import {
  assertFeeApprovalPayloadMatches,
  type FeeApprovalToken,
} from './assert-fee-approval-payload';

export interface ISignFeeApprovalChallengeParams extends IEnvParam {
  /** The account that signs the approval. */
  account: Address;
  /** The chain the approval is for. */
  chainId: ChainId;
  /** An EIP-1193 provider for the account's wallet. */
  provider: EIP1193Provider;
  /**
   * The most the approval may let the claimer take per mint, in token base
   * units: what `getMintingFee` reads, in satoshis. Refused when zero or above
   * 100000 (0.001 BTC).
   */
  maxMintFee: string;
  /**
   * Requested expiry as an absolute UNIX timestamp in seconds. Defaults to 24
   * hours out. The server may shorten it; the value it chose is returned as
   * `signatureExpiresAt`.
   */
  expiry?: number;
  /** The token the approval is signed against. Defaults to LBTC. */
  token?: FeeApprovalToken;
}

/** The JWT the verification issued, and the approval that was signed. */
export interface ISignFeeApprovalChallengeResult extends WalletVerifyResult {
  /** The EIP-712 document that was signed, as the server issued it. */
  payload: string;
  /** The signature over `payload`. */
  signature: string;
  /**
   * When the approval itself expires, as chosen by the server. Distinct from
   * `expiresAt`, which is when the JWT expires.
   */
  signatureExpiresAt?: string;
}

/**
 * Signs a server-issued mint-fee approval and verifies it.
 *
 * The fee-approval counterpart of `signPermitChallenge`. The typed data is
 * built server-side and handed to the wallet as the exact string returned,
 * since re-serialising it can move the digest the server reserved. What it
 * authorises is not taken on trust: the digest is recomputed, and the chain,
 * token contract, struct, fee and expiry are compared with the request and
 * the SDK's own addresses before the wallet is asked. A document that differs
 * is refused, so a substituted permit or a larger fee is never signed under
 * the name of a fee approval.
 *
 * `challengeType` is sent again on verify, because challenges are stored per
 * address and type. Verification issues a wallet JWT, returned with the
 * signature; a host already holding a session decides whether to keep it.
 *
 * @throws {FeeApprovalChallengeMismatchError} when the issued approval does not
 * describe the one that was asked for.
 * @throws {ActivePermitExistsError} when verify reports an approval already in
 * force.
 * @throws if the request is out of bounds, the server issues a challenge of a
 * different type, its digest does not match the payload, or verification
 * fails.
 */
export async function signFeeApprovalChallenge({
  account,
  chainId,
  provider,
  maxMintFee,
  expiry = toUnix(now() + DAY),
  token = Token.LBTC,
  env = DEFAULT_ENV,
}: ISignFeeApprovalChallengeParams): Promise<ISignFeeApprovalChallengeResult> {
  // Both checked before the request, so the parameter that is wrong is the one
  // the error names.
  assertValidExpiry(expiry);
  assertMintingFeeWithinBounds(maxMintFee);

  const tokenAddress = getTokenAddressForChain(
    chainId,
    AddressKind.Token,
    env,
    token,
  );
  if (!tokenAddress) {
    throw new Error(
      `No ${token} address is known for chain ${String(chainId)} in ${env}.`,
    );
  }

  const chain = getLegacyChainNameById(chainId);

  const challenge = await requestWalletChallenge({
    address: account,
    chain,
    challengeType: WALLET_CHALLENGE_TYPE.feeApproval,
    feeApproval: { maxMintFee, expiry, token: tokenAddress },
    env,
  });

  // A challenge whose params the gateway dropped comes back as the plain-text
  // message, which the wallet would sign and the server then refuse.
  if (challenge.challengeType !== WALLET_CHALLENGE_TYPE.feeApproval) {
    throw new Error(
      `Expected a fee approval challenge, got ` +
        `${challenge.challengeType ?? 'none'}. The gateway may not be ` +
        `forwarding challenge_type.`,
    );
  }

  assertDigestMatches(challenge.payload, challenge.digest, 'fee approval');
  assertFeeApprovalPayloadMatches(challenge.payload, {
    chainId,
    maxMintFee,
    expiry,
    token,
    env,
  });

  let signature: string;
  try {
    signature = (await provider.request({
      method: 'eth_signTypedData_v4',
      params: [account, challenge.payload],
    } as unknown as Parameters<EIP1193Provider['request']>[0])) as string;
  } catch (error) {
    // A wallet rejects with an EIP-1193 object, not an Error.
    throw new Error(
      `Wallet rejected the fee approval signature: ${getErrorMessage(error)}`,
    );
  }

  if (typeof signature !== 'string' || !signature.startsWith('0x')) {
    throw new Error('Wallet returned no signature for the fee approval');
  }

  const verified = await verifyWalletSignature({
    address: account,
    payload: challenge.payload,
    ...(challenge.clientSecret ? { clientSecret: challenge.clientSecret } : {}),
    signature,
    chain,
    // Required: challenges are keyed by address and type together.
    challengeType: WALLET_CHALLENGE_TYPE.feeApproval,
    env,
  });

  const jwt =
    verified.kind === 'complete'
      ? { jwt: verified.jwt, expiresAt: verified.expiresAt }
      : await pollWalletVerification({
          verificationId: verified.verificationId,
          ...(challenge.clientSecret
            ? { clientSecret: challenge.clientSecret }
            : {}),
          env,
        });

  return {
    ...jwt,
    payload: challenge.payload,
    signature,
    ...(challenge.signatureExpiresAt
      ? { signatureExpiresAt: challenge.signatureExpiresAt }
      : {}),
  };
}
