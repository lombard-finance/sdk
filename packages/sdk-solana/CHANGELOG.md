# Changelog

All notable changes to `@lombard.finance/sdk-solana` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Deprecated

- `unstakeLBTC` and `UnstakeLBTCParams` — legacy LBTC-program `redeem` path; use `redeemForBtc` with `tokenMint` set to `getConfig(env).lbtcTokenMint` for LBTC → BTC (see migration notes under [2.0.0]). Marked `@deprecated` in JSDoc; removal planned for a future major version.

## [2.0.0] - 2026-03-19

### Migration: `unstakeLBTC` → `redeemForBtc` (LBTC → BTC)

Replace `unstakeLBTC(provider, params)` with `redeemForBtc(provider, params)`.

| Former (`unstakeLBTC`) | New (`redeemForBtc`) |
| --- | --- |
| `amount`, `btcAddress`, `network`, `rpcUrl?` | Same fields supported |
| (implicit LBTC mint from config) | Set **`tokenMint`** to the LBTC SPL mint for your environment — use `getConfig(env).lbtcTokenMint` (or the same value you rely on elsewhere). If omitted, the default mint is **BTC.b** from config, not LBTC. |
| — | Optional: `env` (override vs `networkToEnv[network]`), `debug`, `skipPreflight` (see `RedeemForBtcParams` in source) |

**Config requirements:** `redeemForBtc` uses the **Asset Router** and **Mailbox** stack. For the chosen `Env`, `getConfig(env)` must define non-null **`assetRouter`**, **`mailbox`**, **`solanaRoutingChainId`**, and **`bitcoinRoutingChainId`**. If any are missing, the call fails early with a clear error (environments such as `testnet` / `prod` in this package may leave these `null` until they are wired — use an environment where they are populated, e.g. `devnet` / `stage`, matching your deployment).

**On-chain path:** the old API invoked the legacy LBTC program’s `redeem` instruction directly; the new API burns/redeems via Asset Router flows (`redeemForBtc` routes by mint: LBTC vs BTC.b).

### Removed

- **BREAKING:** `SolanaServiceImpl.unstake()` method
- `UNSTAKE_REJECTED_ERROR` constant (unused; `ErrorCode.UNSTAKE_REJECTED` is retained for Asset Router error handling)

### Added

- `redeem()` — Asset Router generic `redeem` instruction (LBTC → BTC.b on Solana)
- `redeemForBtc()` — added LBTC → BTC flow (alongside existing BTC.b → BTC), routed by `tokenMint`
- `getTokenFeeConfig()` — reads Asset Router `TokenConfig` account (redeem fee, min redeem amount, max mint commission, native commission) for a given token mint on Solana
- `getRedeemFeeSolana()` — total redeem fee (`toNativeCommission + redeemFee`), equivalent to EVM `getRedeemFee`
- `getMintingFeeSolana()` — max minting commission, equivalent to EVM `getMintingFee`
- `getMinRedeemAmountSolana()` — minimum redeem amount (excluding fee), equivalent to EVM `getMinRedeemAmount`
- `getMinRedeemAmountWithFeeSolana()` — minimum transfer amount for successful redemption (fee + min amount), equivalent to EVM `getMinRedeemAmountWithFee`

### Changed

- Restructured `redeemToken/` module: shared context (`shared.ts`), per-token flows (`redeemBtcb.ts`, `redeemLbtc.ts`), routing entry point (`redeemForBtc.ts`)
- Updated Storybook with token selector (BTC.b / LBTC) and dynamic UI

---

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
