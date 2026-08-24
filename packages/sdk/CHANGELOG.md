# 5.4.0

### Configurable Stake-And-Bake Signature Expiry

`signStakeAndBake()` has always accepted an expiry and defaulted to 24 hours, but no higher-level caller could set one. `SignStakeAndBakeParams` had no `expiry` field, so `EvmService.signStakeAndBake()` could not forward one; neither deploy config threaded it; and `authorizeDeposit()` took no arguments at all. Every consumer going through `btc.stakeAndDeploy()` or `btc.depositAndDeploy()` was pinned to 24 hours, and a user whose signature lapsed had to come back and sign again.

```ts
const action = sdk.chain.btc.stakeAndDeploy({
  assetOut: AssetId.LBTC,
  destChain: Chain.ETHEREUM,
  protocol: DefiProtocol.Veda,
});

await action.prepare({ amount: '0.1', recipient: '0x...' });

// Ten days instead of 24 hours
await action.authorizeDeposit({
  expiry: Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60,
});
```

`expiry` is an **absolute UNIX timestamp in seconds**, matching the low-level parameter it forwards to, so no second unit convention enters the SDK. Omitting it passes `undefined` the whole way down rather than computing a default en route, so the 24-hour fallback stays in exactly one place.

On routes with a non-zero deadline, an `expiry` is rejected with an `INVALID_PARAMETER` error before anything reaches the network unless it is a whole number of seconds, in the future, and no more than **365 days** ahead.

Each bound catches a different mistake, and they get progressively quieter:

- **Not a whole number** — a fractional value is what `Date.now() / 1000` produces without a `Math.floor`. `BigInt()` would otherwise turn it into a `RangeError` from inside the permit build, naming neither the parameter nor its unit.
- **Not in the future** — a relative duration (`7 * 24 * 60 * 60` puts the deadline in 1970) or a stale timestamp. Either signs and stores successfully and only fails when the permit is used on chain.
- **Beyond 365 days** — `Date.now()` passed unconverted. It is a positive safe integer in the future, so it clears both bounds above and sets the deadline tens of thousands of years out. Nothing fails at any point: the permit signs, is stored, and stands as an allowance to the vault spender that never lapses. This is the only bad expiry with no downstream symptom, which is what the upper bound exists for. The error names milliseconds directly when the magnitude matches.

The override reaches the signer through all four hops — action, config, service, signer — and each is covered by a test that fails if the hop drops it.

`useBtcStakeAndBake()` in `@lombard.finance/sdk-react` accepts `expiry` on its `stakeAndDeploy` params and forwards it, so consumers on the hook are not pinned to the default either.

`authorizeDeposit()` still takes no required arguments, so **every existing call site compiles and behaves as before**.

The BTC.b vault route signs with a zero deadline (`deadlineStrategy: 'zero'`), so the option is accepted there for interface parity and has no effect on that route.

# 5.3.0

### Deposit Address Over The Wallet JWT

The BTC deposit address can now be obtained with a wallet JWT instead of a destination-address signature. The token already proves control of the destination address, so the request that carries it needs no signature of its own.

### Added

- `resolveDepositBtcAddress({ address, chainId, token, walletJwt, partnerId, referrerCode, nonce, destinationAssetAddress, env })` posts to `POST /v2/addresses/deposit` with `Authorization: Bearer <walletJwt>` and returns the BTC deposit address. It is the signature-free counterpart of `generateDepositBtcAddress`: no destination-address signature, no captcha. The JWT comes from the existing `requestWalletChallenge` / `verifyWalletSignature` flow.
  - The v2 host comes from `getApiConfig(env).baseApiV2Url`, so every environment (dev, stage, testnet, ibc, prod) reaches its own gateway.
  - A 401, and a 403 for a JWT that does not authorise the requested address, are both raised as `UnauthorizedWalletJwtError`, so consumers already handling an expired vault-manager token handle this route the same way.
  - A sanctioned destination resolves to `SANCTIONED_ADDRESS`, matching `generateDepositBtcAddress` rather than throwing.
  - `destinationAssetAddress` names the asset **instead of** `token`, not in addition to it: the two are one field on the wire and a request carrying both is refused. A token with no `ASSET_TYPE_*` identifier is reachable this way.
  - `env` alone picks the network. A testnet chain id resolves to its mainnet identifier, so the chain id and the environment have to be consistent at the call site.
- `canResolveDepositBtcAddressWithJwt(chainId, token = Token.LBTC)` reports whether the route has an identifier for that pair. `false` is not an error: it means the caller keeps to `generateDepositBtcAddress`. The route names `LBTC` and `BTCb`; any other token falls back instead of guessing a wire name.
- `getDepositAssetTypeById(token)` returns the `ASSET_TYPE_*` identifier for a token, and throws when there is none.
- `getLegacyChainNameById(chainId)` returns the short `BLOCKCHAIN_*` identifier that the v2 address route accepts, derived from the same chain resolution as `getChainNameById`. A testnet deployment answers to its mainnet name (holesky and sepolia are both `BLOCKCHAIN_ETHEREUM`), and non-EVM chains are covered too.

### Changed

- `UnauthorizedWalletJwtError` moved to the shared error module so routes outside the vault-manager can raise it. It is still exported from `@lombard.finance/sdk/strategies` and its `name` is unchanged; only the message text is now route-agnostic (`Wallet JWT rejected (<url>)`).

---

# 5.2.2

### Fixed

The `dev` environment now sends v2 API requests to `https://api.devnet-bft.lombard-fi.com` instead of `https://bft-dev.stage.lombard-fi.com`.

The dev v1 host does not serve the `/v2/*` routes, so every v2 call from that environment returned HTTP 404 — `POST /v2/auth/wallet/challenge` and the rest of the wallet-auth flow (`verify`, `verify/status`, `token/revoke`), plus the strategy metrics endpoints (`nav-history`, `rates-history`, per-user positions). `baseApiUrl` is unchanged, so v1 calls keep hitting the same host as before.

# 5.2.1

### Fixed

A BTC action no longer stores its fee approval or stake-and-bake signature with the server when that same signature is about to be sent to `generateDepositAddress`.

Both halves used to happen: the action signed, stored the signature itself, and then handed it to address generation, which stores it again. The server cannot tell that second write apart from the same signature being presented for a second address request, so the deposit address request looks like a reuse of an approval that is readable on chain, in the mint calldata and the event logs.

The rule is now one writer per signature. Each of `BtcDeposit`, `BtcStake`, `BtcDepositAndDeploy` and `BtcStakeAndDeploy` stores it only when it is not about to carry it into address generation, which is exactly when it already holds a deposit address, resuming a flow whose address was created earlier. In that case nothing else would store it: `generateDepositAddress` returns the address it already has without a network call.

No API change for callers. `authorizeFee()`, `authorizeDeposit()` and the address generation that follows are called exactly as before; the config-level `authorizeFee`, `authorizeDepositAndDeploy` and `authorizeStakeAndBake` gained an optional `storeSignature` parameter that defaults to `true`, so a custom chain config keeps its current behaviour.

# 5.2.0

### Deprecated

Corn (chain id `21000000`) and Swellchain (chain id `1923`) are retired. Neither network produces blocks any more — Swell Network shut its sequencer down at the end of June 2026 — so a transaction routed to either is accepted into the mempool and can never be mined.

Both are gone from the chain registry, the Earn vault, the bridge, the deploy/stake/withdraw routes and every config that referenced them, so no code path can reach them. Their **identifiers are kept as deprecated aliases** for this release and are removed in the next major:

- `ChainId.corn`, `ChainId.swell`
- `Chain.CORN`, `Chain.SWELL`
- `AssetId.WBTCN` (Corn was its only deployment)
- `featureConfig.isCornEnabled`, `featureConfig.isSwellchainEnabled` — now no-ops that gate nothing

Referencing these identifiers still compiles, so upgrading from 5.1.x does not break a build. Using one as a live chain does not: the retired ids are excluded from the `ChainId` type (via the new `RetiredChainId` type), so passing `ChainId.corn` to an SDK function is a type error instead of a runtime failure against a dead network.

What was actually removed for both chains: the RPC endpoints, the viem chain mappings, the LBTC and OFT adapter addresses, the asset-catalog deployments, the `ethereum <-> corn` and `ethereum <-> swell` OFT bridge routes and their LayerZero endpoint ids (`30335` for Swellchain), Corn's Veda deploy/stake/withdraw routes and Earn network mappings, the DefiLlama chain-name mappings and the prod-env classification.

The most user-visible behavioural effect: `EARN_VAULT.chains` no longer lists Corn, so `getEarnDepositsAllChains` and `getEarnWithdrawalsAllChains` stop fanning out to it. That Corn leg had been failing with HTTP 500 on every call (`Failed to fetch deposits for chain 21000000`), so the fan-out now issues 3 requests instead of 4 and no longer logs a per-call error. Historical Corn positions are no longer reachable through these aggregates.

`Token.wBTCN` is intentionally **kept** so existing clients can still label historical Veda vault transactions; only its Corn address entry was dropped.

### Added

- `RETIRED_CHAINS` and `isRetiredChain(chain)` identify chains that no longer produce blocks. Retired chains keep their `CHAIN_CATALOG` entry so historical activity can still be labelled, but carry no `explorerUrl` (both explorers are offline) and are excluded from `getMainnetChains`, `getTestnetChains` and `getChainsByType`.

### Changed

- Stable mainnet (chain 988) now uses the public RPC endpoint `https://rpc.stable.xyz` in both `chains.ts` and `rpc-url-config.ts`, replacing the endpoint that was hardcoded while the network was still coming up. The public endpoint is rate limited to 1000 requests per 10 seconds per IP; consumers needing more throughput should pass their own transport.

---

# 5.1.1

### Fixed

- `ASSET_CATALOG` now lists Ethereum mainnet as a production deployment chain for BTC.b (`0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072`). The address was already present in the legacy `EVM_BTCB_ADDRESSES` registry, so catalog-driven helpers (`getAssetChains`, `getAssetDeployment`, and the rest of `core/assets/utils`) disagreed with the token registry and reported BTC.b as unavailable on prod Ethereum.

---

# 5.1.0

### Added

- Wallet authentication module (`walletAuthModule`) implementing the v2 wallet-auth flow. Three endpoints are wrapped:
  - `requestChallenge` → `POST /v2/auth/wallet/challenge` — returns a chain-specific payload to be signed by the user's wallet.
  - `verifySignature` → `POST /v2/auth/wallet/verify` — exchanges a signed payload for a JWT. Accepts an optional `publicKey` for chains where pubkey is not recoverable from the signature (Starknet, Cosmos).
  - `revokeToken` → `POST /v2/auth/token/revoke` — invalidates a JWT server-side; best-effort (swallows network errors so callers can always clear local state).
- Low-level functional exports for the same endpoints — `requestWalletChallenge`, `verifyWalletSignature`, `revokeWalletToken` — for consumers that don't want the module/DI layer.
- `WalletAuthService` class implementing the `WalletAuthService` interface from `@lombard.finance/sdk-common`.
- Signing the challenge with the user's wallet is intentionally NOT included — signing is chain-specific and belongs in the corresponding chain SDK package (or the consuming app).
- New `@lombard.finance/sdk/strategies` entry point for the Lombard DeFi Vault Strategy contract (codename "BTCoc"). Distinct from the Bitcoin Earn vault exposed under `@lombard.finance/sdk/vaults` — do not conflate the two. Env-first: a call picks a strategy (`strategyId`, default BTCoc) and an environment (`env`), and the chain follows from that pair — `prod` → Ethereum mainnet, `stage` → Base Sepolia. An env may host several per-chain deployments (each with its own contract address); an optional `chainId` selects among them and defaults to the primary (first) chain.
  - Per-user / op reads: `getStrategyPosition`, `getStrategyDepositAssets`, `getStrategyPendingRedeem`, `getStrategyShards`, `previewStrategyDeposit`.
  - Writes: `depositStrategy` (4-arg `deposit(asset, amount, receiver, minSharesOut)`, approves the Strategy contract on insufficient allowance), `requestStrategyRedeem` (async redeem; parses `requestId` from the `RedeemRequested` event, supports `waitForReceipt: false` for Safe multisig flows).
  - Types: `IStrategyState`, `IStrategyPosition`, `IStrategyConfigResponse`, `IStrategyDepositAsset`, `IStrategyDepositAssetStatic`, `IStrategyShards`, `IStrategyPendingRedeem`, `IRequestStrategyRedeemResult`, plus function-parameter types (`GetStrategy*Parameters`, `DepositStrategyParameters`, `RequestStrategyRedeemParameters`).
  - Config: `STRATEGIES` registry + `DEFAULT_STRATEGY_ID`, resolvers `resolveStrategy` / `getStrategyDeployment` / `getStrategyDeployments` / `getStrategyChainIds` / `getStrategyDefinition`, and `findStaticDepositAsset`. Each strategy maps every environment to a list of per-chain deployments — each deployment carries its own `chainId`, contract address, and static deposit-asset catalog (LBTC / BTC.b on Ethereum, LBTC / BTC.b / USDT / wETH / BTCt on Base Sepolia).

---

# 5.0.5

### Fixed

- `sdk.chain.evm.redeem()` (BTC.b → native BTC) no longer triggers a network-fee authorization step. The action burns BTC.b on the EVM source chain and releases native BTC on the Bitcoin network — there is no auto-mint on an EVM destination, so the auto-mint fee model (used by BTC Deposit and EVM Unstake → BTC.b on Ethereum/Sepolia) does not apply. `prepare()` now transitions `IDLE → READY` directly on every source chain, including Ethereum and Sepolia, eliminating the unexpected EIP-712 signing prompt and the `GET /api/v1/claimer/get-user-signature` call that previously fired on those chains.

### Deprecated

- `IEvmRedeem.authorizeFee()` is now a deprecated **safe no-op** kept for backwards compatibility with consumers that subscribed to the previous status machine. The status never reaches `NEEDS_FEE_AUTHORIZATION`, and calling `authorizeFee()` resolves immediately without touching the wallet, the API, or the action state — so legacy code paths that still invoke it will no longer fail.

### Docs

- Removed stale JSDoc on `EvmActions.redeem()`, `EvmRedeem` types, and the redeem factory that described a non-existent `LBTC → BTC.b` same-chain unwrap. The actual `LBTC → BTC.b` flow lives in `sdk.chain.evm.unstake()` with `assetOut: AssetId.BTCb`.

---

# 5.0.4

### Fixed

- BTC stake fee-auth flow now recovers when the BFF reports that a fee signature already exists for the account (`FeeSignatureAlreadyExistsError`, code 6). Previously this surfaced as a confusing error after the user had already signed. The SDK now refetches the stored signature and continues the workflow. If the BFF reports a duplicate but will not return the existing record, a clearer error message is surfaced instead.

### Added

- Exported `FeeSignatureAlreadyExistsError` from the package root so consumers can branch on this specific failure mode when calling the underlying fee-auth APIs directly.

---

# 5.0.3

### Fixed

- Fixed Earn BFF helpers to honor `env` end-to-end so non-prod deployments stop hitting `bff.prod.lombard-fi.com`.

---

# 5.0.2

### Fixed

- `sdk.chain.evm.withdraw().approve()` now unwraps just enough BTCe BEFORE issuing the share approval on BTCe-supported chains. Without this, wallets that cap the displayed approval amount at the user's current token balance (e.g. OKX) granted an allowance smaller than the requested withdraw amount when the user's direct LBTCv balance was below the requested amount, causing the subsequent queue tx in `execute()` to revert on `allowance < amount`. The 5.0.1 reorder inside `withdrawEarn` masked this in `execute()` but produced an extra approve popup; with this fix `withdrawEarn` skips both approve and unwrap in `execute()` (single popup), and on BTCe chains with insufficient direct LBTCv the `approve()` step issues 2 popups (unwrap + approve). Behavior on Corn (no BTCe) and when direct LBTCv already covers the amount is unchanged: a single approve popup.

---

# 5.0.1

### Fixed

- `withdrawEarn()` and `previewWithdrawEarn()` now order the orchestrator steps as **unwrap → approve → queue** (previously approve → unwrap → queue). Wallets that cap the displayed approval amount at the user's current token balance (e.g. OKX) would otherwise show the pre-unwrap LBTCv balance and grant an allowance smaller than the withdraw amount, causing the final queue tx to revert. With the new order, the post-unwrap balance is in place by the time the approve prompt is shown. The pre-flight `maxWithdraw` check is unchanged.

---

# 5.0.0

## 🚨 BREAKING CHANGES

The five vault-shaped functions deprecated in 4.8.0 have been removed from the public API. They were replaced by Earn-native equivalents that handle the BTCe wrapper internally. The two deprecated `getEarnPosition` response field aliases have also been removed.

### Bitcoin Earn rename

The product is now called **Bitcoin Earn**. Public symbols that referenced "Veda" (the underlying protocol) or the legacy "Vault" abstraction have been renamed. Internal references to Veda's contracts, ABIs, and the `DefiProtocol.Veda` enum are unchanged because they identify a real third-party protocol.

| Removed                                                        | Replacement                                          |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| `Vault` enum, `VAULTS` map, `VaultNameMap`                     | (deleted, single Bitcoin Earn vault)                 |
| `getVaultDeposits`, `getVaultDepositsAllChains`                | `getEarnDeposits`, `getEarnDepositsAllChains`        |
| `getVaultWithdrawals`, `getVaultWithdrawalsAllChains`          | `getEarnWithdrawals`, `getEarnWithdrawalsAllChains`  |
| `getVaultMinimumDeposit`, `previewVaultDeposit`                | `getEarnMinimumDeposit`, `previewEarnDeposit`        |
| `getVaultApy`, `getVaultPoints`, `getVaultTVL`                 | `getEarnApy`, `getEarnPoints`, `getEarnTVL`          |
| Type aliases (`GetVault*Parameters`, `VedaVaultDeposit`, etc.) | Renamed to `GetEarn*Parameters`, `EarnDeposit`, etc. |
| `vaultKey: Vault` parameter on the public Earn helpers         | Removed (single vault, redundant)                    |

The list above covers the public-facing renames. The full mapping is in [`MIGRATION_5.md`](./MIGRATION_5.md).

### Removed exports

| Removed                                                                                                                                                  | Replacement                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `deposit({ amount, token, vaultKey, account, chainId, provider })`                                                                                       | `depositEarn({ amount, token, account, chainId, provider })`                                                                 |
| `queueWithdraw({ amount, token, vaultKey, account, chainId, provider })`                                                                                 | `withdrawEarn({ amount, account, chainId, provider })`                                                                       |
| `cancelWithdraw({ token, vaultKey, account, chainId, provider })`                                                                                        | `cancelEarnWithdrawal({ withdrawalAsset?, account, chainId, provider })`                                                     |
| `getSharesByAddress({ vaultKey, chainId, address })`                                                                                                     | `getEarnPosition({ address, chainId })` then read `.underlyingShares`                                                        |
| `getShareValue({ vaultKey, chainId })`                                                                                                                   | `getEarnPosition({ address, chainId }).exchangeRate`                                                                         |
| Parameter types: `DepositParameters`, `QueueWithdrawParameters`, `CancelWithdrawParameters`, `IGetSharesByAddressParameters`, `IGetShareValueParameters` | New types: `DepositEarnParameters`, `WithdrawEarnParameters`, `CancelEarnWithdrawalParameters`, `IGetEarnPositionParameters` |
| `IGetEarnPositionResponse.lbtcvShares` (deprecated alias added in 4.8.0)                                                                                 | `IGetEarnPositionResponse.underlyingShares`                                                                                  |
| `IGetEarnPositionResponse.btceSharesInLbtcv` (deprecated alias added in 4.8.0)                                                                           | `IGetEarnPositionResponse.btceSharesInUnderlying`                                                                            |

The `lbtcvShares` / `btceSharesInLbtcv` removal is a **runtime-shape break** (not just a type rename): destructuring those names from a `getEarnPosition` result returns `undefined` even in untyped JavaScript. Update reads to the new names.

The `LOMBARD_SDK_SUPPRESS_DEPRECATION` env var no longer has any effect (no deprecation warnings remain in 5.0.0).

### Migration

See [`MIGRATION_5.md`](./MIGRATION_5.md) at the package root for per-symbol before/after code blocks.

### Internal-only retention

The implementations live on as `@internal` helpers (`depositInternal`, `queueWithdrawInternal`, `cancelWithdrawInternal`, `getSharesByAddressInternal`, `getShareValueInternal`) and remain reachable from the SDK's own action classes (`EvmDeploy`, `EvmWithdraw`, `EvmCancelWithdraw`) and the new BTCe-native helpers. They are not part of the public API and are not re-exported from any entry point.

### Migration support

The `4.8.0` line stays available on npm and includes runtime deprecation warnings for the same functions. If you need a soak window, pin to `^4.8.0` until you're ready to bump.

---

# 4.8.0

### Added

- `depositEarn()` — high-level deposit orchestrator. Handles ERC20 approval to the BTCe contract and routes the deposit through the wrapper, returning the wrap transaction hash. Accepts the same `Token` enum as the legacy `deposit`.
- `withdrawEarn()` — high-level withdrawal orchestrator. Reads both legs of the user's position (direct underlying-share + BTCe), checks the wrapper's `maxWithdraw` before sending any transaction, then issues 1–3 transactions in order (approve, conditional unwrap, queue). Throws typed errors on insufficient position or insufficient unwrappable balance before any state change.
- `previewWithdrawEarn()` — read-only predictor that returns the steps `withdrawEarn` would execute and the expected wallet-popup count, so integrators can render a step indicator before the user signs.
- `cancelEarnWithdrawal()` — cancels a pending Earn withdrawal request.

### Changed

- `getEarnPosition()` response renamed: `lbtcvShares` → `underlyingShares`, `btceSharesInLbtcv` → `btceSharesInUnderlying`. Behavior unchanged.

### Deprecated

The following exports are now `@deprecated` and emit a one-time runtime warning when called. They will be removed in 5.0.0. Set `process.env.LOMBARD_SDK_SUPPRESS_DEPRECATION` to silence the warning.

- `getSharesByAddress` → use `getEarnPosition`
- `getShareValue` → use `getEarnPosition().exchangeRate`
- `deposit` → use `depositEarn`
- `queueWithdraw` → use `withdrawEarn`
- `cancelWithdraw` → use `cancelEarnWithdrawal`

---

# 4.7.2

### Fixed

- Fixed Ethereum chain detection to include Sepolia, so Ethereum-specific flows such as Bascule mint-history checks also run on the Ethereum testnet.

---

# 4.7.1

- **Solana companion package** (`@lombard.finance/sdk-solana` ≥2.0.1): `deposit()`, `redeem()`, and `redeemForBtc()` derive the Mailbox `senderConfig` PDA from the Asset Router `messaging_authority` PDA instead of the Asset Router program ID. Upgrade the Solana package when targeting the upgraded Mailbox program. This `@lombard.finance/sdk` release documents that dependency; see `packages/sdk-solana/CHANGELOG.md` for details.

---

# 4.7.0

### Added

- `solana.stake()` — new action for BTC.b → LBTC on Solana via Asset Router (mirrors the EVM `stake` pattern).
- `solana.unstake()` — new same-chain route LBTC → BTC.b on Solana (Asset Router `redeem`), alongside the existing cross-chain LBTC → BTC. Output is selected via `assetOut`; `SolanaUnstakeParams` is unchanged.
- Solana **mainnet** production routes enabled for stake, unstake, redeem and BTC → BTC.b deposit (`Env.prod`, `SOLANA_MAINNET`). Previously only dev/stage/testnet were wired.
- BTC.b Solana-mainnet deployment added to the asset catalog and token-addresses map.
- Optional `txHash?: string` field on `StrategyProgress` in `core/types.ts` (used by Solana actions to surface the submitted Solana signature before final confirmation). Purely additive.

### Changed

- `solana.redeem()` now routes through the Asset Router `redeemForBtc` flow (replacing the direct GMP dispatch used previously). Route semantics (BTC.b → BTC) and `SolanaRedeemParams` are unchanged.
- `SolanaRedeem` terminal status changed from `CONFIRMING` to `COMPLETED`. Integrations that treated `CONFIRMING` as the end-of-flow marker for this action should switch to `COMPLETED`.
- `SolanaUnstake` route config reshaped: `unstake/config/solana.ts` merged into `unstake/config/btc.ts`, and `RouteDefinition` now carries `assetIn`/`assetOut` to disambiguate BTC vs BTC.b destinations.
- Renamed `NonEvmUnstakeStatus` to `NonEvmOperationStatus` in `statusConstants.ts` — the constant is now shared by all non-EVM actions (Solana Stake/Unstake/Redeem, Sui Unstake, Starknet Unstake). Update imports if you reference the old name directly.

### Fixed

- Corrected the LBTC **Solana mainnet** address in the asset catalog and `SOLANA_TOKEN_ADDRESSES`. It previously pointed to the LBTC **program ID**; it is now the actual SPL **token mint**. Mainnet flows relying on the catalog/token-addresses lookup could not resolve a valid mint before this fix.

---

# 4.6.0

- Added `getBtceShares()` to read a user's BTCe wrapper vault balance on Ethereum, Base, or BSC. BTCe is an ERC4626 wrapper around the Veda vault's LBTCv share token.
- Added `getEarnPosition()` to compute the user's full Bitcoin Earn position (LBTCv + BTCe) on a single chain. Routes BTCe shares through the wrapper's `convertToAssets` to value them in LBTCv terms before summing and applying the Veda accountant rate, so the math stays correct if the wrapper ever drifts off the current 1:1 peg.
- Added `wrapToBtce()` for wrapping a supported deposit asset (LBTCv, LBTC, wBTC, etc.) into BTCe shares via the wrapper's multi-asset `deposit(token, assets, receiver, minShareAmount)` overload. Caller is responsible for approving the deposit token to the BTCe contract first (use `approveToken`).
- Added `unwrapBtceToLbtcv()` for unwrapping BTCe back into LBTCv via `withdraw(assets, receiver, owner)`. Throws if the requested amount exceeds the wrapper's `maxWithdraw(owner)`. To complete the round-trip to LBTC, follow up with `queueWithdraw()` from the SDK.
- Added BTCe vault config exports: `BTCE_VAULT_CHAINS`, `BTCE_VAULT_CONTRACTS`, `BtceVaultChain`, `isBtceVaultChain`.
- Clarified `getSharesByAddress()` JSDoc: the function returns LBTCv direct holdings only and does not include BTCe-wrapped positions. Use `getEarnPosition()` for the full Bitcoin Earn view.

---

# 4.5.2

- Fixed `mapUnstakeEntry` overwriting an already-present `to_address` with a value derived from `output_script`. The script-based derivation now only runs when `toAddress` is not yet set.

---

# 4.5.1

- **Solana companion package** (`@lombard.finance/sdk-solana` ≥1.2.2): consortium `claimToken()` uses epoch-seeded session PDAs and an updated Consortium IDL. Upgrade the Solana package when targeting the upgraded consortium program. This `@lombard.finance/sdk` release documents that dependency; see `packages/sdk-solana/CHANGELOG.md` for details.

---

# 4.5.0

- Added `getVaultMinimumDeposit()` to calculate the minimum deposit amount for a given token that produces at least 1 vault share. The minimum is derived from the on-chain exchange rate and updates as the vault accrues yield.
- Added `previewVaultDeposit()` to simulate a vault deposit and return the expected shares for a given amount. Uses the on-chain Lens contract for accurate results including share premiums.

---

# 4.4.1

- Fixed `getDepositStatus()` never returning `'expired'` despite the backend setting `SESSION_STATE_EXPIRED` on the deposit's `sessionState` field. The expired check is now correctly placed after `failed` and `auto_claimed` so that more definitive terminal states take priority.
- Deprecated `MIN_CLAIM_AMOUNT_BTC` in favour of `MIN_STAKE_AMOUNT_BTC`. Both constants are identical (`0.0002` BTC) — `MIN_CLAIM_AMOUNT_BTC` is now a re-export alias and will be removed in a future major version.
- Improved `isNative` JSDoc on the `Deposit` type to clarify that `false` means a Bitcoin mainnet direct deposit and `true` means an EVM/alt-chain native deposit.

---

# 4.4.0

- Added Solana destination support for BTC deposits, including destination signing and route configuration for Solana chains.
- Added Solana `redeem()` actions for BTC.b -> BTC flows, including stage routing.
- Added `MIN_REDEEM_AMOUNT_BTC` export.

---

# 4.3.3

- Fixed fee authorization status being overwritten in `EvmUnstake.prepare()` and `EvmRedeem.prepare()`. The `successStatus` argument to `act()` was eagerly evaluated before the callback ran, always resolving to READY and preventing the NEEDS_FEE_AUTHORIZATION transition. This caused `authorizeFee()` to never be called on unsubsidized chains (Ethereum, Sepolia), meaning the `save-user-signature` API was never invoked.
- Fixed ESM build producing minified internal export names (e.g., `export { B as g }`) that broke Vite dev mode resolution. Set `minifyInternalExports: false` in the Rollup output config.
- Removed WBTC from EVM deposit configuration.

---

# 4.3.2

- Fixed `captchaToken` not being forwarded to the deposit address generation API. The parameter was accepted by the low-level `generateDepositBtcAddress()` function but was never reachable from action classes (`BtcStake`, `BtcDeposit`, `BtcDepositAndDeploy`, `BtcStakeAndDeploy`). All `generateDepositAddress()` methods now accept an optional `captchaToken` parameter.

---

# 4.3.1

- Fixed EVM action `approve()` methods not awaiting transaction receipt before transitioning to READY status. Affected actions: `EvmWithdraw`, `EvmDeploy`, `EvmStake`. The approval transaction is now confirmed on-chain before the action proceeds.

---

# 4.3.0

- Added partner helper functions (`getLBTCMintingFee`, `signLbtcDestinationAddr`)
- Updated chain configurations and feature flags

---

# 4.2.0

- Added `EvmWithdraw` and `EvmCancelWithdraw` actions for vault withdrawal flows
- Added code splitting with new subpath entry points (`/api`, `/btc`, `/evm`, `/contracts`, `/core`, `/defi`, `/metrics`, `/utils`, `/vaults`, `/bridge`, `/debug`) for tree-shaking support
- Added MegaETH support and CCIP bridge configuration
- Added Avalanche mainnet support
- Added BTCb to ETH bridge functionality
- Updated withdrawal deadline from 3 to 14 days
- Fixed BTCb claiming on Avalanche
- Fixed Starknet ref code handling
- Improved bridge status tracking

---

# 4.1.1

- Fixed BTCb claiming on Avalanche chains: `getBasculeDepositStatus` now uses `getBascule()` for Bridge Token Adapter contracts instead of `Bascule()`, resolving "Function 'Bascule' not found on ABI" errors

---

# 4.1.0

- Enabled Avalanche mainnet

---

# 4.0.0

## 🚀 Major Release: Action-Based Architecture

This release introduces a completely redesigned SDK with an action-based architecture that provides a unified, type-safe interface for all Lombard operations.

### ⚠️ Breaking Changes

- **New action-based API**: All operations now use the unified action pattern
  - Before: `stakeViaBTC(...)`, `unstakeLBTC(...)`, `redeemToken(...)`
  - After: `sdk.btc.stake()`, `sdk.chain.evm.unstake()`, `sdk.chain.evm.redeem()`
- **Chain module access**: Non-EVM chains accessed via `sdk.chain.<chain>.<action>()`
  - `sdk.chain.solana.unstake()`
  - `sdk.chain.sui.unstake()`
  - `sdk.chain.starknet.unstake()`
- **Removed deprecated functions**: Legacy wrapper functions removed in favor of actions
- **TypeScript 5.4+ required**

### ✨ New Features

- **Unified Action Pattern**: All operations follow consistent lifecycle (prepare → approve → execute → complete)
- **Built-in State Management**: Actions emit status and progress events
- **Integrated Validation**: Automatic balance, allowance, and fee authorization checks
- **Resume Support**: Actions can be resumed from any state
- **Event System**: Rich event emission for UI integration
- **SDK Playground**: Interactive demo at `https://lombard.finance/playground`

### 🔧 Improvements

- **Better error handling**: Structured errors with codes and metadata
- **Loading states**: Built-in loading indicators for async operations
- **Progress tracking**: Step-by-step progress events with percentage
- **TypeScript improvements**: Enhanced type inference and stricter typing

### 📦 Peer Dependencies

```bash
npm i --save viem@^2.23.15 axios@^1 bignumber.js@^9 @bitcoinerlab/secp256k1@1.2.0 bitcoinjs-lib@6.1.5 @layerzerolabs/lz-v2-utilities@3.0.17 isows@^1.0.7
```

### 📚 Migration

See the [Migration Guide](./docs/user-guides/MIGRATION-V4.md) for detailed upgrade instructions.

---

# 3.7.4

- added missed chains to CHAIN_ID_TO_LLAMA_CHAIN_NAME_MAP

# 3.7.3

- added from_token_address fiild for unstakes
- added bitcoin blockchain identifier

# 3.7.2

- **added stable support**

# 3.7.1

- **added monad support**

# 3.7.0

- **added custom signer support for flexible transaction signing:**
  - introduced `SignerAdapter` interface for custom transaction signing logic,
  - `redeemToken` and `unstakeLBTC` now accept either `provider` (legacy) or `signer` (custom) parameter,
  - backward compatible - existing provider-based code continues to work unchanged.
- added `depositToken` function that triggers the deposit method on the LBTC contract,
- replaced `token` parameter of `redeemToken` function with a pair of new parameters `tokenIn` (the token that is being redeemed) and `tokenOut` (the token received after redemption, defaults to `undefined` [**BTC**]),
- introduced `fetchAllPaginated` utility to handle pagination across all endpoints,
- added unified deposits support:
  - introduced `Deposit` interface to unify Direct BTC Deposits and Native Deposits APIs.
  - added `isNative` flag to distinguish between deposit types.
  - added fetchers: `fetchDirectDeposits` and `fetchNativeDeposits` (now uses `fetchAllPaginated` internally).
  - added unified `getDepositsByAddress` function to fetch and combine deposits from both APIs.
  - improved mapping helpers: `mapDirectBtcDeposit` and `mapNativeDeposit` to normalize fields such as `txHash`, `eventIndex`, `amount`, `blockTime`, `fromChainId`, `toChainId`, `toTokenAddress`, `toToken`, `sanctioned`, `claimTxHash`, and `notarizationWaitDur`.
  - added JSDoc for all deposit types and fetchers.
  - ensured robust error handling: failure of one API does not prevent fetching from the other.
  - renamed `signature` property to `proof`.
- refactored unstakes fetching:
  - `fetchUnstakesByAddress` now uses `fetchAllPaginated` internally,
  - removed `unstakeDate` property from `Unstake` interface,
  - added `blockTime` property to `Unstake` to retain original timestamp,
  - added `isNative` flag to distinguish between unstakes (directly to BTC) and redemptions (to native chain).
  - `fromChainId` and `toChainId` clearly separated; `toChainId` is undefined for BTC unstakes,
  - fully typed JSDoc added for `Unstake`, `UnstakeEntry`, and fetchers,
  - public API `getUnstakesByAddress` added as a wrapper over the fetcher.
- renamed tokens:
  - `Token.NativeLBTC` to `Token.BTCb` (`BTC.b`)
  - `Token.BTCB` to `Token.BTCBinance` (`BTCB` - Binance BTC wrapper)
  - deprecated `Token.BTCK` which will be sunset as soon as the Katana contracts are updated.
- btc.b support
  - katana, megaETH

# 3.6.23

- added Katana chain support to `getBasculeDepositStatus` with proper GMP payload decoding and mintID calculation.

# 3.6.21

- changed sevenseas api requests to proxy through bff

# 3.6.20

- updated LBTC token contract addresses for staging environment.

# 3.6.19

- added Starknet-specific logic for BTC deposit address generation.
- added token contract addresses for Starknet Sepolia.

# 3.6.18

- removed deprecated rewards (BABY) logic,
- introduced `IPointsBase` interface to capture **common fields** shared across all seasons.
- added `IPointsByAddressSeason1` interface for Season 1 specific points:
  - `okxPoints`
  - `flashEvent1Points`
  - `flashEvent2Points`
- added `IPointsByAddressSeason2` interface for Season 2 specific points:
  - `refereePoints`
  - `checkinPoints`
- made `totalWithoutBadgesPoints` optional in the base interface but required in Season 1.
- `getPointsByAddress` function now accepts a `season` parameter (`1 | 2`) and returns the correct typed object based on season.
- added convenience wrappers:
  - `getLuxSeason1Points()` → returns `IPointsByAddressSeason1`
  - `getLuxSeason2Points()` → returns `IPointsByAddressSeason2`
- improved type safety to prevent access to season-specific fields incorrectly.
- default season is now 2 when no `season` is provided.
- updated README.md.

# 3.6.17

- added support for season 2 points - added `season` parameter to the `getPoinstByAddress`.

# 3.6.16

- season 1 points API changes (removed campaign requests, now part of the same API).

# 3.6.15

- added `bob` chain,
- added token contract address on `bob`.

# 3.6.14

- fixed the issue with unused and unpublished dependencies.

# 3.6.13

- added new `token` parameter to the `signStakeAndBake` function,
- by default, `token` is set to `"BTC"`, and the value is automatically converted to LBTC using the current exchange ratio,
- if `token` is explicitly set to `"LBTC"`, the value is used as-is (no conversion).

# 3.6.12

- total points earned by address are taken from the API and not calculated any more.

# 3.6.11

- Add CHANGELOG.md to published package.

# 3.6.10

- `Token.BTCK` is now an alias of `Token.NativeLBTC` (recommended).

# 3.6.9

- fixed issue with getting the deposit address on Sui and Solana networks.

# 3.6.8

- reverted changes from 3.6.6 - the Bascule address has been fixed in the contract.

# 3.6.7

- added new `getMinRedeemAmount` function that return the min redeem amount.

# 3.6.6

- disabled Bascule check for Katana

# 3.6.5

- fixed issue with the LBTC token contract address on Etherlink.

# 3.6.4

- added `getEstimatedApy` function,
- added new `inProgress` field to `PositionsSummary` type of `getPositionsSummary`.

# 3.6.3

- updated rewards API url and schema for `getRewardsInfo`,
- renamed `getRewardsInfo` to `getPositionsSummary`,
- added `getApy` function and remove `apr` from `getLBTCStats`,
- added `getAdditionalRewards` function.

# 3.6.2

- updated rewards API urls for `getRewardsInfo`.

# 3.6.1

- changed configuration for upgraded LBTC and BTCK (Native LBTC) on Tatara chain
  (stage and testnet),
- added auto-detection for upgraded LBTC and BTCK contracts,
- updated redeem fee logic based on the recent ABI changes,
- `getTokenContractInfo` in now an async function,
- refactored the internal `AbiFor` type and upgraded contracts logic,
- added `accountAddress` and `partnerId` params to the `getLBTCStats` function.

# 3.6.0

- `Token.LBTC` ABI changes to `stLBTC` for specified chains: `Sepolia`,
- added new `Token.NativeLBTC`,
- changed `getLBTCMintingFee` and `getMintingFee` so it either takes the value
  from the token contract (old version) or `AssetRouter` contract (new version),
- renamed `getBurningFee` to `getRedeemFee` and refactored it so it takes the
  fee values from the `AssetRouter` or the token contract (old version).

# 3.5.12

- added `tac` chain and bridge eth - tac bridge (OFT).

# 3.5.11

- updated the BFF API urls.

# 3.5.10

- added `token_address` param to generate and get deposit address functions.

# 3.5.9

- changed LBTC addresses for `dev` env.

# 3.5.8

- fixed exports for `getExchangeRatio`

# 3.5.7

- added `getRewardsInfo` function that retrieves the information about earned
  rewards (yield),
- added `apr` to the `getLBTCStats` function,
- added `getExchangeRatio` function that gets the exchange ratios of LBTC:BTC
  and BTC:LBTC.

# 3.5.6

- added support for Katana chain.

# 3.4.0

- bug fixes,
- added `getVaultDeposits` and `getVaultWithdrawals`.

# 3.2.0

- added metrics `getVaultTVL`, `getVaultApy`, `getLBTCStats`.

# 3.1.0

- added function to manually deposit / withdraw to and from the DeFi vault,
- switched to `viem`.
