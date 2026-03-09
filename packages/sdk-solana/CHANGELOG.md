# Changelog

All notable changes to `@lombard.finance/sdk-solana` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-03-09

### Added

- Added `claimToken()` flows for claiming BTC.b from deposit payloads on Solana `stage`
- Added `redeemForBtc()` on Solana `stage` for redeeming BTC.b to BTC through Asset Router and Mailbox
- Added Solana IDLs and helper loaders for Asset Router, Consortium, Mailbox, Ratio Oracle, Bridge, and Lombard Token Pool

## [1.1.1] - 2025-03-04

### Fixed

- Prevent IDL mutation by returning a deep copy from `getLbtcIdl()`

## [1.1.0] - 2025-02-01

### Added

- Solana wallet connection and transaction signing
- LBTC balance queries and transfers
- BTC deposit address generation
- LBTC claiming and unstaking flows
- LayerZero OFT integration for cross-chain operations
