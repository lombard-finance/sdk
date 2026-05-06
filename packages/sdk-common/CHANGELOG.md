# Changelog

All notable changes to `@lombard.finance/sdk-common` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
