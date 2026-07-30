# Changelog

All notable changes to `@lombard.finance/sdk-sui` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-07-30

### Fixed

- Sui Foundation disabled JSON-RPC on its public fullnodes, so `getFullnodeUrl()` now resolves to an endpoint that answers every method with `-32601 Method not found`. `suiModule()` was pinned to it, which broke every operation the module performs. It now talks to nodes that still serve JSON-RPC

### Added

- `createSuiClient(network, options)` and `getDefaultSuiRpcUrls(network)`, exported so callers can build the same failover client for the low-level functions that take a `client` argument. The client walks an ordered list of endpoints, retrying on transport errors and on unhealthy responses (408, 425, 429, 500, 502, 503, 504), and does not retry a request a node actually answered
- Each attempt carries its own timeout (`timeoutMs`, 20s by default), combined with the caller's signal. Without it a node that accepts the connection and then hangs would stall the call, since failover only advances once an attempt settles. An abort from the caller ends the chain instead of falling through to the next node
- `suiModule({ rpcUrls })` to override the endpoints, for example to point at your own nodes and avoid the rate limits of public ones. Keyed by network (`{ mainnet: [...], testnet: [...] }`), because the service resolves the network per call from the chain id, so one instance can serve several networks
- Test setup for the package, split per the repository convention: `test` runs the offline unit suite (`vitest.unit.config.ts`), `test:live` probes the real endpoints (`vitest.live.config.ts`). The unit suite is wired into `test:required`, so it runs in CI

### Notes

- This is a stopgap. JSON-RPC is scheduled for removal from the Sui node binary in mid-October 2026, after which these nodes stop working too and the package has to move to gRPC
- On testnet the default order puts Blockvision first, because the other public nodes answer `suix_getCoinMetadata` with `null` there, which makes `getBalance` and `prepareCoinsTransaction` fall back to hardcoded decimals

## [1.2.0] - 2026-06-30

### Added

- `getBasculeDepositStatus` to query a deposit's Bascule status (`REPORTED` / `UNREPORTED` / `WITHDRAWN` / `PAUSED`) from a mint payload, plus the `SuiBasculeDepositStatus` enum and the `deriveDepositId` helper
- `claimLBTC` now pre-flights the Bascule deposit status and throws a descriptive error instead of letting the on-chain `bascule::validate_withdrawal` abort the mint

### Changed

- Updated Sui mainnet treasury package address to the upgraded `lbtc_v5_current` deployment so `mint_v2` and `redeem` calls resolve correctly

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
