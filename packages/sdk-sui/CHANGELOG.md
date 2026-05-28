# Changelog

All notable changes to `@lombard.finance/sdk-sui` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.3] - 2026-05-27

### Fixed

- Updated Sui staging treasury package address to the upgraded deployment so `mint_v2` and `redeem` calls resolve correctly

## [1.1.2] - 2026-05-05

### Fixed

- Updated Sui staging LBTC claim mint target to use `treasury::mint_v2` instead of the deprecated `treasury::mint`

## [1.1.1] - 2025-03-04

### Fixed

- Added fallback for `CoinMetadata` fetch failures using `LBTC_DECIMALS` constant

## [1.1.0] - 2025-02-01

### Added

- Sui wallet integration via wallet-standard
- BTC deposit address generation
- LBTC claiming and unstaking flows
- Balance queries for LBTC on Sui
