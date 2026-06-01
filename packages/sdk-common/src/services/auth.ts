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

export interface WalletVerifyResponse {
  /** JWT bound to the verified wallet address. */
  jwt: string;
  /** ISO-8601 timestamp when the JWT expires. */
  expiresAt: string;
}

export interface RevokeWalletTokenRequest {
  /** JWT to invalidate server-side. */
  jwt: string;
}

/**
 * Wallet auth service contract. Implementations live in `@lombard.finance/sdk`.
 */
export interface WalletAuthService {
  /** Request a challenge payload for the given wallet. */
  requestChallenge(
    params: WalletChallengeRequest,
  ): Promise<WalletChallengeResponse>;

  /** Submit a signed challenge and receive a JWT. */
  verifySignature(params: WalletVerifyRequest): Promise<WalletVerifyResponse>;

  /**
   * Invalidate a JWT server-side. Best-effort: implementations may swallow
   * network errors so callers can always clear local state.
   */
  revokeToken(params: RevokeWalletTokenRequest): Promise<void>;
}
