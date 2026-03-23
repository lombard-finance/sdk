# Changelog

All notable changes to `@lombard.finance/sdk-solana` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.2] - 2026-03-23

### Changed

- `claimToken()` now derives the consortium session PDA with seeds `["session", current_epoch (u64 big-endian), payer, payload_hash]`; `current_epoch` is read from the on-chain consortium config account (after the Anchor discriminator and admin fields). Callers who only use `claimToken()` do not need code changes. **Custom integrations** that derived the session PDA with the old layout (`["session", payer, payload_hash]`) must match the new seeds (and stay in sync with the deployed program).
- Refreshed bundled Consortium IDL: new instructions `close_session_for_epoch` and `set_initial_valset_from_session`, `system_program` added where required by the program, and account/type layout aligned with the deployed program.

## [1.2.1] - 2026-03-10

### Changed

- Patch release: version bump aligned with the `@lombard.finance/sdk-common` workspace package in the monorepo. No further source changes in `@lombard.finance/sdk-solana` for this tag beyond the version field.

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
