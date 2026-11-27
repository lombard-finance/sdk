# Changelog

All notable changes to `@lombard.finance/sdk-starknet` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-09-08

### Added

- `setStarknetRpcEndpoints(chainId, urls)` replaces the RPC endpoint list for a chain at runtime, for a host with a key or a paid node. Previously the endpoint was hardcoded with no way to override it, so a retired node could only be worked around by releasing a new version.

### Changed

- Each chain now holds a list of RPC endpoints and fails over to the next one when a node answers with prose, a non-JSON body, or a JSON-RPC code that means the node itself is unavailable (a spent quota, an internal error, or `-32601`, which is how a rate-limited node reports being over its limit). A body carrying any other JSON-RPC error is passed through unchanged, so a real contract error still surfaces as itself. The endpoint that last answered is tried first, so an outage costs one probe rather than one per request, and each request has a 15s deadline so a node that stops answering cannot hang a read.

### Fixed

- Mainnet reads no longer point at `rpc.starknet.lava.build`, which has been retired and answers HTTP 410 to every request, breaking every on-chain read. Mainnet is now `api.cartridge.gg` with `api.zan.top` behind it; Sepolia keeps `api.cartridge.gg` with `starknet-sepolia.drpc.org` behind it. Endpoint order follows twelve sequential `starknet_call` probes per candidate, recorded in `utils/rpc-providers.ts`.

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
