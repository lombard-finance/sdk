/**
 * Wallet Auth Service
 *
 * Contract for the wallet-based authentication flow used by the Lombard
 * backend (v2):
 *
 *   1. `requestChallenge` — server returns a payload the wallet must sign.
 *   2. `verifySignature`  — server validates the signature and issues a JWT.
 *   3. `revokeToken`      — invalidates a JWT server-side (e.g. on disconnect).
 *
 * Signing the challenge with the user's wallet is intentionally NOT part of
 * this contract — signing primitives are chain-specific and live in the
 * corresponding chain SDK packages.
 */

/**
 * Supported chain identifiers accepted by the auth API.
 *
 * Free-form string to stay open to chains added on the backend before the
 * SDK is updated. Common values: `'ethereum'`, `'solana'`, `'sui'`,
 * `'starknet'`, `'cosmos'`.
 */
export type WalletAuthChain = string;

export interface WalletChallengeRequest {
  /** Wallet address performing the auth flow. */
  address: string;
  /** Chain the address belongs to. */
  chain: WalletAuthChain;
}

export interface WalletChallengeResponse {
  /** Random nonce embedded in the payload. */
  nonce: string;
  /** Chain-specific payload the user must sign with their wallet. */
  payload: string;
  /** ISO-8601 timestamp when this challenge expires. */
  expiresAt: string;
}

export interface WalletVerifyRequest {
  address: string;
  /** The payload returned by `requestChallenge`. */
  payload: string;
  /** Signature produced by the wallet over `payload`. */
  signature: string;
  chain: WalletAuthChain;
  /**
   * Required for chains where the public key cannot be recovered from the
   * signature (Starknet, Cosmos). Ignored elsewhere.
   */
  publicKey?: string;
}

/**
 * Verification status returned by `/v2/auth/wallet/verify` and its polling
 * endpoint. EVM EOAs / Sui / Solana verify synchronously and get a JWT
 * immediately; EVM smart-contract wallets and Starknet verify asynchronously
 * (the signature is checked on-chain), so the caller must poll for the JWT.
 */
export const VERIFICATION_STATUS = {
  /** Synchronous verification finished — JWT is in this same response. */
  syncComplete: 'VERIFICATION_STATUS_SYNC_COMPLETE',
  /** Async verification started — poll with the returned `verification_id`. */
  pending: 'VERIFICATION_STATUS_PENDING',
  /** Async verification succeeded — JWT is in the poll response. */
  completeValid: 'VERIFICATION_STATUS_COMPLETE_VALID',
} as const;

/** Token pair issued once verification succeeds (sync or async). */
export interface WalletVerifyResult {
  /** JWT bound to the verified wallet address. */
  jwt: string;
  /** ISO-8601 timestamp when the JWT expires. */
  expiresAt: string;
}

/**
 * Outcome of `POST /v2/auth/wallet/verify`: either an immediate token
 * (`complete`, sync path) or a `verificationId` to poll while the signature is
 * verified on-chain (`pending`, async path).
 */
export type WalletVerifyResponse =
  | ({ kind: 'complete' } & WalletVerifyResult)
  | { kind: 'pending'; verificationId: string };

export interface RevokeWalletTokenRequest {
  /** JWT to invalidate server-side. */
  jwt: string;
}

export interface PollWalletVerificationRequest {
  /** Id returned by `verifySignature` when the result is `pending`. */
  verificationId: string;
}

/**
 * Wallet auth service contract. Implementations live in `@lombard.finance/sdk`.
 */
export interface WalletAuthService {
  /** Request a challenge payload for the given wallet. */
  requestChallenge(
    params: WalletChallengeRequest,
  ): Promise<WalletChallengeResponse>;

  /**
   * Submit a signed challenge. Resolves with a JWT (`complete`) on the sync
   * path, or a `verificationId` (`pending`) that must be polled via
   * `pollVerification` on the async path.
   */
  verifySignature(params: WalletVerifyRequest): Promise<WalletVerifyResponse>;

  /**
   * Poll the async verification endpoint until the on-chain signature check
   * settles, resolving with the JWT. Only needed when `verifySignature`
   * returns a `pending` result.
   */
  pollVerification(
    params: PollWalletVerificationRequest,
  ): Promise<WalletVerifyResult>;

  /**
   * Invalidate a JWT server-side. Best-effort: implementations may swallow
   * network errors so callers can always clear local state.
   */
  revokeToken(params: RevokeWalletTokenRequest): Promise<void>;
}
