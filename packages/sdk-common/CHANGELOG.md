# Changelog

All notable changes to `@lombard.finance/sdk-common` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
