# Changelog

All notable changes to `@lombard.finance/sdk-sui` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-08-06

The package now talks gRPC-Web instead of JSON-RPC. Sui is removing JSON-RPC from the node binary in mid-October 2026, and the official fullnodes already answer every JSON-RPC method with `-32601 Method not found`; gRPC is what they kept serving. The third-party JSON-RPC nodes the 1.3.0 failover leaned on are on the same clock.

### Breaking

- Every exported function that took a `client: SuiClient` (`claimLBTC`, `unstakeLBTC`, `getBalance`, `isBasculeCheckEnabled`, `getBasculeDepositStatus`) now takes a `client: SuiGrpcClient` from `@mysten/sui/grpc`. Build one with `createSuiGrpcClient(network, options)`
- `createSuiClient`, `getDefaultSuiRpcUrls`, `resolveSuiRpcOptions`, `ISuiRpcOptions` and `ISuiNetworkRpcOptions` are gone, replaced by `createSuiGrpcClient`, `getDefaultSuiGrpcUrls`, `resolveSuiGrpcOptions`, `ISuiGrpcOptions` and `ISuiNetworkGrpcOptions`. The endpoint override key is `grpcUrls` (the old `rpcUrls` values would not work: JSON-RPC nodes do not serve gRPC-Web, so reusing the key would break silently)
- `suiModule({ rpcUrls })` is now `suiModule({ grpcUrls })`, same reasoning
- `claimLBTC` and `unstakeLBTC` return the executed transaction in the gRPC core shape (`ISuiExecutedTransaction`: `digest`, `effects`, ...) instead of `SuiTransactionBlockResponse`. The `digest` field survives unchanged
- Endpoints with credentials in the url are rejected at construction: WHATWG `fetch` refuses userinfo urls, so such an endpoint would fail on every request with an unexplained `TypeError`. Private gRPC providers key by path instead. Query strings are rejected for the same fail-loudly reason, since the transport appends `/package.Service/Method` to the base
- The `@mysten/sui` dependency floor moved to `^1.45.2`, the first 1.x with the gRPC client this package builds on

### Added

- `createSuiGrpcClient(network, { grpcUrls, timeoutMs })`: the same failover policy the JSON-RPC client had, translated to gRPC-Web. Reads walk the endpoint list on transport errors, retryable statuses (403, 404, 405, 408, 425, 429, 500, 502, 503, 504), a 200 that is not a gRPC-Web answer (a node that dropped the protocol), and trailers-only `UNIMPLEMENTED`/`INTERNAL`/`UNAVAILABLE`/`RESOURCE_EXHAUSTED`. A transaction submit is re-sent only on `UNIMPLEMENTED`, which proves nothing was executed. The endpoint that last worked is remembered
- Default endpoints per network: the official fullnodes first (`fullnode.<network>.sui.io`), then suiscan, the one public third-party node that answered a gRPC-Web probe. The publicnode and blockvision nodes from the JSON-RPC list do not speak gRPC-Web and are gone
- `executeSignedTransaction(client, { bytes, signature })` and the `ISuiExecutedTransaction` type, exported for consumers that submit wallet-signed bytes themselves

### Changed

- Dynamic-field reads (the treasury `bascule_check` flag, the Bascule deposit table) derive the field object id locally, exactly as the chain does, and read the object's node-rendered JSON; JSON-RPC's `suix_getDynamicFieldObject` has no gRPC counterpart. The rendering differences are absorbed inside: Move structs arrive flattened (no `fields` nesting), a `u64` as a string, an enum as `{ "@variant": "Name" }`
- Coin decimals come from `StateService.GetCoinInfo` instead of `suix_getCoinMetadata`. Unpublished metadata (testnet) still falls back to the LBTC decimals; a node failure still throws rather than silently degrading into wrong decimals

## [1.3.0] - 2026-07-30

### Fixed

- Sui Foundation disabled JSON-RPC on its public fullnodes, so `getFullnodeUrl()` now resolves to an endpoint that answers every method with `-32601 Method not found`. `suiModule()` was pinned to it, which broke every operation the module performs. It now talks to nodes that still serve JSON-RPC
- `getBasculeDepositStatus` no longer blocks a claim the treasury would let through. `treasury::mint_v2` consults the Bascule only while the treasury's `bascule_check` flag is set, so with the flag off a deposit mints without ever being reported, yet the pre-flight still reported it as `UNREPORTED` and `claimLBTC` refused to submit. The flag is now read first, and the status is the new `NOT_ENFORCED` when the mint is not gated by the Bascule at all. The flag is currently off on testnet and stage, where this blocked every claim
- A failed status read — an unreachable node, or a treasury carrying no `bascule_check` flag — used to reach `claimLBTC` callers as a raw error in the middle of plainly worded refusals. It now reads like the others, with the original error kept as `cause`. A malformed payload is still reported as itself, and is now rejected before the wallet is asked to sign rather than being truncated into a mint that aborts on chain
- A transaction submit is no longer re-sent to another endpoint. Sui dedupes by digest, so a resend is usually harmless, but a node that took the transaction and then failed to answer in time would have the next node's rejection reported for a transaction that actually landed. A submit moves on only for `-32601`, which says the node never knew the method and so executed nothing; everything else is surfaced as the node's own error. The reads a claim performs first have already pinned a healthy endpoint by then
- `-32603 Internal error` no longer takes a request through every endpoint. Sui returns it both for a broken node and for one request that failed inside a healthy one, so a request that fails everywhere took three times as long to say so. It now counts as a node failure for reads only, while `-32601` still counts for everything
- `403` joins the retryable statuses: the proxies in front of the public nodes answer with it (Cloudflare's `error code: 1010`) for clients they dislike, which surfaced as an opaque status error instead of moving to the next node

- The per-endpoint deadline now covers the response body, not just its headers. `fetch` resolves once headers arrive, so a node that answered and then stalled mid-stream used to hang with the timer already cleared — the exact failure the timeout exists to prevent. Draining the body in the same window also releases the connection of an answer that is about to be discarded, instead of leaving it pinned until GC
- A signal that had already aborted before the call was ignored, because an abort listener does not fire for it, and the request went out anyway. It now rejects without touching the network
- Endpoints with credentials in them (`https://user:key@node.example/rpc`), which is how private providers hand them out, were rebuilt from `URL.origin` and so were requested anonymously, giving a 401 that does not fail over and says nothing about the cause. Userinfo is now preserved
- `suiModule()` built a new client on every operation, discarding the transport's memory of which endpoint last worked, so a dead first endpoint cost its full timeout every time. The service now keeps one client per network

### Added

- `createSuiClient(network, options)` and `getDefaultSuiRpcUrls(network)`, exported so callers can build the same failover client for the low-level functions that take a `client` argument. The client walks an ordered list of endpoints, retrying on transport errors and on unhealthy responses (408, 425, 429, 500, 502, 503, 504), and does not retry a request a node actually answered
- Each attempt carries its own timeout (`timeoutMs`, 20s by default), combined with the caller's signal. Without it a node that accepts the connection and then hangs would stall the call, since failover only advances once an attempt settles. An abort from the caller ends the chain instead of falling through to the next node
- `suiModule({ rpcUrls })` to override the endpoints, for example to point at your own nodes and avoid the rate limits of public ones. Keyed by network (`{ mainnet: [...], testnet: [...] }`), because the service resolves the network per call from the chain id, so one instance can serve several networks
- Endpoints are validated when the client is built. `rpcUrls` comes from whoever embeds the package, so a malformed entry, or one that would downgrade RPC traffic to plaintext, now throws instead of being requested
- `SuiBasculeDepositStatus.NOT_ENFORCED`, for a mint the Bascule does not gate. It is mintable, so a consumer that gates a claim on `=== REPORTED` has to allow this one alongside it
- `isBasculeCheckEnabled({ client, env })`, exported so a consumer can tell whether the treasury enforces the Bascule at all. It reads the treasury's `bascule_check` dynamic field per call, so a toggle is picked up without re-initialising, and throws when the treasury has no such field, which is the case in which the on-chain `is_bascule_check_enabled` aborts and no mint can succeed
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
