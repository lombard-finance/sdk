# Changelog

All notable changes to `@lombard.finance/sdk-common` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.4.0] - 2026-08-24

### Added

- `LombardAuth`, `AuthRequestContext` and `RequestScope` — the transport contract for the wallet token. `LombardAuth.getToken(context)` is asynchronous so a host can refresh rather than only hand back what it already holds, and `context` carries the request's url and scope so the decision can be made per request. `RequestScope` distinguishes a `public` read, where a token is attached when available and never required, from a `userScoped` one, which fails locally without it. That distinction exists because the SDK reads chain state before any wallet is connected, so requiring a token everywhere would break first paint.

- `signIn` on the `WalletAuthService` interface, with `WalletSignInParams`, `WalletSignInResult` and `WalletSignResult`. Consumers were building this on top of challenge/verify/poll, which meant each of them re-derived the sync/async branch — and that branch is a property of the wallet rather than a choice, so handling only the synchronous case works until the first contract wallet signs in and then strands that user with a signature and no token.

  A required member on an exported interface is technically breaking for an external implementor. In practice this interface is one the SDK implements and consumers call — it arrived in 4.1.0 saying exactly that — so this is a minor.

## [4.3.0] - 2026-08-24

### Added

- `WALLET_CHALLENGE_TYPE` and `WalletChallengeType` name what the wallet-auth challenge should contain. The default is the plain-text terms-of-service message; `permit` and `feeApproval` ask the server for EIP-712 typed data instead, so one signature both proves control of the address and authorises the on-chain action.
- `PermitChallengeParams` (`value`, `deadline`) and `FeeApprovalChallengeParams` (`maxMintFee`, `expiry`) carry the params those challenge types require. Both timestamps are requests: the server may shorten them and reports what it chose.
- `WalletChallengeRequest.challengeType`, `.permit` and `.feeApproval`.
- `WalletChallengeResponse.challengeType`, `.digest` and `.signatureExpiresAt`. `digest` is the EIP-712 digest the server reserved, so a caller can check the payload hashes to it before prompting a wallet. `signatureExpiresAt` is when the signed authorisation lapses, as distinct from `expiresAt`, which is when the unsigned challenge stops being redeemable.
- `WalletVerifyRequest.challengeType`, which must repeat the value used to request the challenge — challenges are stored per address _and_ type.

All fields are optional and the defaults are unchanged, so existing callers are unaffected.

## [4.2.0] - 2026-08-21

### Added

- `SignStakeAndBakeParams.expiry` — optional signature expiration as an absolute UNIX timestamp in seconds. Present so `EvmService` can forward a caller-supplied expiry to `signStakeAndBake`, which has always accepted one. Omitting it preserves the 24-hour default.

## [4.1.0] - 2026-06-01

### Added

- `WalletAuthService` interface and supporting types (`WalletAuthChain`, `WalletChallengeRequest`, `WalletChallengeResponse`, `WalletVerifyRequest`, `WalletVerifyResponse`, `RevokeWalletTokenRequest`) — contract for the v2 wallet-based authentication flow (challenge → verify → revoke). Implementation lives in `@lombard.finance/sdk`.

## [4.0.0] - 2026-03-19

### Removed

- **BREAKING:** `unstake` method from `SolanaService` interface — was unused dead code; all Solana unstake flows use `redeemForBtc` / `redeem` via Asset Router

### Added

- `redeemForBtc` method to `SolanaService` interface — burns BTC.b on Solana and triggers a BTC payout to a specified Bitcoin address
- Optional `env?: Env` parameter to `SolanaService.redeemForBtc` for environment configuration
- `LICENSE` file (MIT) distributed with the package

## [3.4.1] - 2026-03-04

### Added

- Shared environment configuration, provider interfaces, and utility functions used across Lombard SDK packages
- Bitcoin output script generation utilities
- Chain service abstractions
