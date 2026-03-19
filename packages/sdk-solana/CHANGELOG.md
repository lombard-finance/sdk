# Changelog

All notable changes to `@lombard.finance/sdk-solana` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-19

### Removed

- **BREAKING:** `unstakeLBTC` function — removed from public exports; the legacy LBTC-program direct burn path is superseded by Asset Router flows (`redeemForBtc` / `redeem`)
- **BREAKING:** `SolanaServiceImpl.unstake()` method
- `UNSTAKE_REJECTED_ERROR` constant (unused; `ErrorCode.UNSTAKE_REJECTED` is retained for Asset Router error handling)

### Added

- `redeem()` — Asset Router generic `redeem` instruction (LBTC → BTC.b on Solana)
- `redeemForBtc()` — added LBTC → BTC flow (alongside existing BTC.b → BTC), routed by `tokenMint`

### Changed

- Restructured `redeemToken/` module: shared context (`shared.ts`), per-token flows (`redeemBtcb.ts`, `redeemLbtc.ts`), routing entry point (`redeemForBtc.ts`)
- Updated Storybook with token selector (BTC.b / LBTC) and dynamic UI

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
