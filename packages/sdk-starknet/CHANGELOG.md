# Changelog

All notable changes to `@lombard.finance/sdk-starknet` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.4] - 2026-09-01

### Changed

- Depends on `@lombard.finance/sdk-common@4.4.0`. That dependency is written as `workspace:*` and rewritten to an exact version at publish time, so reaching 4.4.0 requires a release of this package.

### Added

- A `test` script and unit tests for the chain utilities. The package had no test script, so `turbo test` skipped it entirely.

No public API change.

## [0.3.3] - 2026-08-11

### Fixed

- `mint` now throws when the Bascule deposit status is not `Reported`, instead of logging a warning and minting anyway. The check was written as a warning while the Bascule contract was still being configured; the contract is now configured for every supported environment, so the guard is enforced. Callers that previously saw a console warning followed by a successful mint will now get a rejected promise with the reported Bascule status in the message.

## [0.3.2] - 2026-07-14

### Fixed

- Default contract reads to the `latest` block tag. starknet.js defaults calls to `pending`, which some RPC nodes reject with `unknown block tag 'pending'`, breaking LBTC balance queries.

## [0.3.1] - 2026-06-08

### Changed

- Switched Sepolia testnet RPC provider to `https://starknet-sepolia.drpc.org`

## [0.3.0] - 2025-03-04

### Added

- Starknet wallet connection and transaction signing
- BTC deposit address generation
- Deposit status tracking
- LBTC minting (claiming) on Starknet
- LBTC balance queries
- LBTC redemption (unstaking) flows

> **Note:** This package is experimental. APIs may change between minor versions.
