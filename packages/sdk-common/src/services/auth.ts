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
  /**
   * When true, the SDK stores the issued JWT in memory and attaches it to
   * subsequent backend requests automatically — no `getAuthToken` config
   * needed for the simple (single-session, client-side) case.
   *
   * Leave unset and supply `getAuthToken` instead when the app owns token
   * storage (SSR, multi-account, persistence across reloads).
   *
   * @default false
   */
  persist?: boolean;
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

/** Result of a chain-specific signature over the challenge payload. */
export interface WalletSignResult {
  signature: string;
  /**
   * Required for chains where the public key can't be recovered from the
   * signature (e.g. Starknet). Ignored elsewhere.
   */
  publicKey?: string;
}

export interface WalletSignInParams {
  /**
   * Wallet address. Optional for EVM — read from the configured provider via
   * `eth_requestAccounts` when omitted.
   */
  address?: string;
  /**
   * Chain name expected by the auth API (as enumerated under `/v2/chains`,
   * e.g. `ethereum_sepolia`). Optional for EVM — derived from the env.
   */
  chain?: WalletAuthChain;
  /**
   * Chain-specific signer: receives the challenge payload, returns the
   * signature (and `publicKey` where required). Optional for EVM — the SDK
   * signs with the configured EVM provider (`personal_sign`).
   */
  sign?: (payload: string) => Promise<WalletSignResult>;
  /**
   * When true, the SDK also stores the issued JWT in memory and attaches it to
   * subsequent requests automatically (no `getAuthToken` wiring needed). The
   * JWT is returned regardless, so the app can store it itself.
   *
   * @default false
   */
  persist?: boolean;
}

export interface WalletSignInResult {
  /** JWT bound to the verified wallet address. */
  jwt: string;
  /** ISO-8601 timestamp when the JWT expires. */
  expiresAt: string;
  /** The address the JWT is bound to. */
  address: string;
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
   * Run the full sign-in flow in one call: request a challenge, sign it, and
   * verify it for a JWT. Hides the challenge/verify ceremony from callers.
   *
   * EVM signs automatically via the configured provider; other chains supply a
   * `sign` callback (with `address`/`chain`). Returns the JWT so the app can
   * store it (or pass `persist: true` to let the SDK hold it).
   */
  signIn(params?: WalletSignInParams): Promise<WalletSignInResult>;

  /**
   * Invalidate a JWT server-side. Best-effort: implementations may swallow
   * network errors so callers can always clear local state.
   */
  revokeToken(params: RevokeWalletTokenRequest): Promise<void>;
}
