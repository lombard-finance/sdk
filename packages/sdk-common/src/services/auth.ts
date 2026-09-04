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

/**
 * What the server should put in the challenge payload.
 *
 * The default (`unspecified`) is a plain-text terms-of-service message signed
 * with `personal_sign`. The other two ask the server to issue EIP-712 typed
 * data instead, so that a single signature both authenticates the wallet and
 * authorises the on-chain action — the user signs once rather than once per
 * purpose.
 *
 * The typed data is built server-side (it reads `nonces(owner)` from the token
 * and picks the deadline) because the nonce and the randomised deadline are
 * what stop a published signature being replayed. Callers sign what they are
 * given; they do not assemble it.
 */
export const WALLET_CHALLENGE_TYPE = {
  /** Plain-text terms-of-service message, signed with `personal_sign`. */
  unspecified: 'WALLET_CHALLENGE_TYPE_UNSPECIFIED',
  /** ERC-2612 permit as EIP-712 typed data. Requires `permit` params. */
  permit: 'WALLET_CHALLENGE_TYPE_PERMIT',
  /** Mint-fee approval as EIP-712 typed data. Requires `feeApproval` params. */
  feeApproval: 'WALLET_CHALLENGE_TYPE_FEE_APPROVAL',
} as const;

export type WalletChallengeType =
  (typeof WALLET_CHALLENGE_TYPE)[keyof typeof WALLET_CHALLENGE_TYPE];

/** Params for a `permit` challenge. */
export interface PermitChallengeParams {
  /** Amount to permit, in token base units. */
  value: string;
  /**
   * Requested permit deadline, as an absolute UNIX timestamp in seconds. The
   * server may shorten it, and reports what it chose as `signatureExpiresAt`.
   */
  deadline: number;
}

/** Params for a `feeApproval` challenge. */
export interface FeeApprovalChallengeParams {
  /** Maximum mint fee to approve, in token base units. */
  maxMintFee: string;
  /**
   * Requested approval expiry, as an absolute UNIX timestamp in seconds. The
   * server may shorten it, and reports what it chose as `signatureExpiresAt`.
   */
  expiry: number;
}

export interface WalletChallengeRequest {
  /** Wallet address performing the auth flow. */
  address: string;
  /** Chain the address belongs to. */
  chain: WalletAuthChain;
  /**
   * Which payload to issue. Omitted, the server issues the plain-text
   * terms-of-service message.
   */
  challengeType?: WalletChallengeType;
  /** Required when `challengeType` is `permit`, ignored otherwise. */
  permit?: PermitChallengeParams;
  /** Required when `challengeType` is `feeApproval`, ignored otherwise. */
  feeApproval?: FeeApprovalChallengeParams;
}

export interface WalletChallengeResponse {
  /** Random nonce embedded in the payload. */
  nonce: string;
  /**
   * The payload the wallet must sign.
   *
   * For a plain-text challenge this is the message itself. For a typed-data
   * challenge it is the EIP-712 document as a JSON string, and it must be
   * handed to the wallet **exactly as received** — this is the JSON the server
   * hashed, and re-serialising it can change the digest it reserved.
   */
  payload: string;
  /** ISO-8601 timestamp when this challenge expires. */
  expiresAt: string;
  /** The challenge type the server actually issued. */
  challengeType?: WalletChallengeType;
  /**
   * EIP-712 digest the server reserved for a typed-data challenge. Empty for a
   * plain-text one. Useful to assert a locally computed digest matches before
   * prompting the wallet.
   */
  digest?: string;
  /**
   * When the *signed authorisation* expires, as distinct from `expiresAt`,
   * which is when the unsigned challenge stops being redeemable. Present for
   * typed-data challenges, and reports the deadline the server chose rather
   * than the one that was requested.
   */
  signatureExpiresAt?: string;
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
   * Must repeat the `challengeType` used to request the challenge: challenges
   * are stored per address *and* type, so omitting it here looks up a
   * plain-text challenge that was never issued.
   */
  challengeType?: WalletChallengeType;
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
/** Result of a chain-specific signature over the challenge payload. */
export interface WalletSignResult {
  signature: string;
  /**
   * Required for chains where the public key cannot be recovered from the
   * signature (Starknet, Cosmos). Ignored elsewhere.
   */
  publicKey?: string;
}

export interface WalletSignInParams {
  address: string;
  chain: WalletAuthChain;
  /**
   * Signs the challenge payload. Chain-specific by necessity — the SDK holds no
   * signing key and each chain's wallets expose a different signing method — so
   * the caller supplies it and the SDK owns everything around it.
   */
  sign(payload: string): Promise<WalletSignResult>;
}

export interface WalletSignInResult extends WalletVerifyResult {
  /** The address the token is bound to, echoed back for convenience. */
  address: string;
}

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
   * Run the whole ceremony: challenge, sign, verify, and poll when the chain
   * verifies on-chain. Prefer this over calling the three separately — the
   * sync/async branch is a property of the wallet rather than a choice, and
   * getting it wrong strands a signed-in user with no token.
   */
  signIn(params: WalletSignInParams): Promise<WalletSignInResult>;

  /**
   * Invalidate a JWT server-side. Best-effort: implementations may swallow
   * network errors so callers can always clear local state.
   */
  revokeToken(params: RevokeWalletTokenRequest): Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Transport: supplying the token to the SDK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Whether a request needs a caller identity.
 *
 * Declared per request rather than inferred, because "attach the token
 * everywhere" is not a viable rule: the SDK reads chain state before any wallet
 * is connected, so requiring one would break first paint.
 */
export type RequestScope =
  /** Attached when a token is available, never required. */
  | 'public'
  /** Required. Fails before the request is sent when no token is available. */
  | 'userScoped';

/** What the SDK knows about a request when it asks for a token. */
export interface AuthRequestContext {
  /** The URL about to be requested. */
  url: string;
  scope: RequestScope;
}

/**
 * How the SDK obtains a wallet JWT.
 *
 * Asynchronous on purpose. The token lives seven days, so any long-lived
 * session will eventually hold an expired one, and a synchronous accessor can
 * only return what it already has — it cannot refresh. Making this a promise
 * moves the refresh decision to the host, which owns the wallet and the signing
 * UX, and lets the SDK stop assuming the cached answer is still good.
 *
 * The SDK never stores the result. It asks per request, so a token acquired
 * after construction is picked up without re-creating anything.
 */
export interface LombardAuth {
  /**
   * Resolve the current token, refreshing if the host judges it necessary.
   *
   * Return `undefined` to mean "no token available". On a `public` request that
   * is fine; on a `userScoped` one the SDK fails before sending.
   */
  getToken(context: AuthRequestContext): Promise<string | undefined>;

  /**
   * Called after a `userScoped` request was rejected twice — once with the
   * original token and once with a freshly requested one.
   *
   * The hook exists so a host can drop its session and prompt for a new
   * signature. It is not a retry callback: the SDK has already retried.
   */
  onUnauthorized?(context: AuthRequestContext): void;
}
