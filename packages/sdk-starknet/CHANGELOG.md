# Changelog

All notable changes to `@lombard.finance/sdk-starknet` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-09-02

### Added

- `setStarknetRpcEndpoints(chainId, urls)` — replace the RPC endpoint list for a chain, for hosts that need a key or to put a paid node ahead of the public one. It clears the cached provider so the next read uses the new list.

- A `test` script and unit tests. The package had no test script, so `turbo test` skipped it entirely.

### Fixed

- **A single public RPC node per chain, with no failover, failed misleadingly.** Once its quota was spent the node answered JSON-RPC `-32601` — "the method starknet*call does not exist/is not available" — which reads as a protocol problem and is a rate limit. Every entry in `PUBLIC_KEY_GETTERS` then failed, `getPublicKey` found nothing, and the resulting error named the \_account*: a healthy, correctly deployed account looked broken.

  Endpoints are now a list per chain, tried in order. A request fails over on a non-ok status, a 15-second timeout, a body that is not JSON, or a JSON-RPC code in `-32601 / -32005 / -32603 / 429`. `-32601` is the surprising member: a code that normally means "unsupported" has to be treated as retryable because that is how a throttled node reports a limit.

  Each chain now lists two endpoints, ordered by measured reliability rather than preference. Twelve sequential `starknet_call` requests from a cold client: lava mainnet 12/12, cartridge mainnet 12/12, cartridge Sepolia 12/12, **drpc Sepolia 9/12** — three of them the `-32601` above. Sepolia's sole endpoint was therefore failing about a quarter of the time at trivial volume, and it is now the fallback behind one that did not fail. Mainnet was never the problem; a second endpoint joins it rather than replacing it.

  All four are free and need no key.

- **`getPublicKey` kept asking after it had the answer.** An account contract has exactly one of the four getters, so every call after the one that answers is a certain failure: four requests per signature where one is needed, three of them guaranteed refusals, against the node that may be throttling because of them. It now stops at the first hit.

### Changed

- Depends on `@lombard.finance/sdk-common@4.4.0`. That dependency is written as `workspace:*` and rewritten to an exact version at publish time, so reaching 4.4.0 requires a release of this package.

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
