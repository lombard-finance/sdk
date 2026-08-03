# Changelog

All notable changes to `@lombard.finance/sdk-common` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.2.0] - 2026-08-03

### Added

- Optional `expiry` field on `SignStakeAndBakeParams`, the stake-and-bake signature expiration as an absolute UNIX timestamp in seconds. Omitting it preserves the previous behaviour (the implementation defaults to 24 hours from signing). Ignored by protocols whose approval config uses a zero deadline.

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
