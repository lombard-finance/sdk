# 6.0.0

Everything in the BTC action consolidation and the action-vocabulary unification
ships in this one major. There is no intermediate 5.x or 6.x release — consumers
migrate once.

### Added

- Everything in 5.4.0 and 5.5.0, merged in: the configurable stake-and-bake signature expiry, and `signPermitChallenge` — one signature that both proves control of the destination address and authorises the vault spender, with the permit recorded for the claimer at verify time.

  Two things changed in the fold. `requestWalletChallenge` and `verifyWalletSignature` arrived using `axios` directly; on this branch they go through `utils/http`, which the auth-token boundary test requires of anything resolving a Lombard host, so the new challenge fields were re-applied on top of the wrapper. And `AuthorizeDepositOptions` — 5.4.0's name for the deploy authorize options — is now a deprecated alias of `BtcAuthorizeOptions`, the unified name the collapsed `authorize()` takes.

### Breaking

- **Two per-account vault routes now require a wallet token.** `getEarnDeposits` and `getEarnWithdrawals` hit `sevenseas-api/{deposits,withdraw-requests}/<network>/<vault>/<account>` — a path keyed by an address — so they are `userScoped` and fail before sending when no token is available, with a `missing-token` error naming the config field that fixes it.

  Previously they were sent anonymously and the gateway allowed it. That allowance is being withdrawn: BFF enforcement is merged behind a flag, so the alternative to failing locally is a 401 from the gateway later. Aggregate routes — `dune-api/query/*` and per-vault performance — stay `public` and are unaffected.

- The nine per-operation event vocabularies are now one. `shared/events.ts` declared the same five events nine times over — `StakeEvent`, `DepositEvent`, `RedeemEvent`, `UnstakeEvent`, `DeployEvent`, `WithdrawEvent`, `BridgeEvent`, `StakeAndDeployEvent`, `DepositAndDeployEvent` — as nine const objects and nine handler-map interfaces with byte-identical members. They collapse to a single `ActionEvent` / `ActionEventMap`.

  **Wire values are unchanged**, so `action.on('progress', ...)`, `'status-change'`, `'completed'`, `'failed'` and `'error'` behave exactly as before. The nine old names were briefly kept as deprecated aliases; they are **removed** in this release rather than deferred, for the reason the verbs went without delegators — a name kept alive keeps being copied. `StrategyEventMap` and `StrategyEvent` were nine-member unions of structurally identical types, which made each equivalent to any single member, and are now that single type.

### Fixed

- **The shipped declarations resolved to `any` for a large part of the surface.**

  The build writes one bundle per export subpath as `dist/<name>.js`, and `tsc` wrote the declaration tree into the same directory — so `dist/core.js` sat beside `dist/core/index.d.ts`, and every internal `from '../../core'` inside a `.d.ts` resolved to the JavaScript file rather than the declaration directory. TypeScript found no types for it and fell back to `any`. Eight subpaths collided that way: `bridge`, `contracts`, `core`, `defi`, `metrics`, `strategies`, `utils`, `vaults`.

  The failure is silent by construction, which is why it went unnoticed through several releases. `skipLibCheck: true` is the default in the Vite, Next and CRA templates, and it suppresses exactly these errors while leaving the affected types as `any` — so the SDK's own `tsc` passed, the consumer's passed, and the consumer lost the types. What surfaced instead was overload resolution picking the wrong signature: with `AssetId` degraded to `any`, `evm.withdraw` could not tell an unstake's parameters from a redeem's.

  Declarations now emit to `dist/types`, where no bundle can shadow them, and the `exports` map points there. Subpaths are unchanged, so nothing about how the package is imported moves; only the location of the declaration files inside it. `yarn check-types-resolve` type-checks every entry in the `exports` map with `skipLibCheck` off and runs as the last step of the build, so a declaration tree that does not resolve fails the build instead of shipping. The build also cleans `dist` first, since a stale layout otherwise survives.

### Breaking

- **`stake` is gone, and with it every other old verb.** No deprecated delegators: `btc.stake`, `btc.stakeAndDeploy`, `btc.depositAndDeploy`, `evm.stake`, `evm.unstake`, `evm.redeem`, `solana.stake`, `solana.unstake`, `solana.redeem`, `sui.unstake` and `starknet.unstake` are removed. A three-verb design that still shipped two `stake` methods was not the design.

  `btc.deposit` absorbs `btc.stake` and dispatches on `assetOut`, the same way `withdraw` dispatches on `assetIn` and `deploy` already did. The two BTC deposit routes had identical parameters apart from the output asset, so one verb dispatching on it is the entire difference. A caller whose asset is only known at runtime matches a fallback overload and narrows the union.

  `evm.stake` becomes `evm.deposit`, and the old `evm.deposit` — claiming a pending BTC.b deposit — is now only `evm.claim`. Those two take identical parameters, so a `deposit` call left unchanged silently becomes the other action; what catches it is the return type, since the claim exposes `needsApproval`, `approve()` and `setClaimData` and the deposit does not. A call whose result is discarded needs checking by hand.

- **`resolveDepositBtcAddress` now retries with the token's contract address when the gateway refuses the asset identifier.**

  The route takes either a `destination_asset_type` or a `destination_asset_address`, never both. The type is the smaller request, but it only works for pairs the gateway has provisioned under that identifier — Sepolia LBTC is not one — and it answers a bare `invalid token address` with nothing pointing at the fix. The caller could pass the address explicitly, but had no way to know they needed to.

  `canResolveDepositBtcAddressWithJwt` returned `true` for exactly those pairs, because all it can check is that the SDK has a name for each half; nothing available to it knows what the gateway has provisioned. Its documentation says that plainly now, and the retry is what makes "worth attempting" good enough in practice. A pair with no catalog address, or a caller who already supplied one, is unchanged — as is any other error.

  `getTokenAddressForChain` takes an optional `token`, defaulting to LBTC, so existing callers are unaffected.

- **`evm.withdraw().approve()` on the BTC.b route always threw.** It asserted `NEEDS_APPROVAL`, and that route prepares straight to `READY` — the allowance is read and granted inside `execute()` — so the status it required was one the route never reaches.

  That made the union-narrowing shape this changelog recommends, `if ('approve' in action) await action.approve()`, fail every time on the BTC.b arm. It is now a documented safe no-op, matching `authorizeFee()` beside it, which was already one for the same reason. Nothing covered it because each class was driven through its own happy path rather than through the union; a test now drives the union.

- **Every action class, interface and param type is renamed, and three ambiguous names are retired rather than reassigned.**

  A verb now dispatches on an asset, so several classes serve one verb — which makes naming a class after a verb a guaranteed collision. Classes carry the verb *and* the asset arm: `BtcStake` is `BtcDepositLbtc`, `BtcDeposit` is `BtcDepositBtcb`, `EvmUnstake` is `EvmWithdrawLbtc`, `EvmRedeem` is `EvmWithdrawBtcb`, `EvmWithdraw` is `EvmWithdrawVault`, `EvmStake` is `EvmDepositBtcb`, `EvmDeposit` is `EvmClaim`, and the Solana, Sui and Starknet classes follow the same pattern. Each `I*`, `*Params`, `*PrepareParams` and `*Progress` moves with its class.

  `BtcDeposit`, `EvmDeposit` and `EvmWithdraw` are now owned by nothing. That is deliberate: handing `EvmDeposit` to the BTC.b deposit action would leave a 5.x import compiling while pointing at a different action, and the two take identical parameters. A retired name is a compile error at the import; a reassigned one is a runtime surprise.

  The per-action status aliases follow their classes — `EvmStakeStatus` is `EvmDepositBtcbStatus`, and so on. All were re-exports of one `EvmOperationStatus`, so only the names change. `EvmDepositStatus` and `EvmWithdrawStatus` now name the core narrowings, which are reachable for the first time: those names were previously taken by the per-action aliases, and the rename freed them.

  Directories follow too — `chains/evm/actions/deposit` held the *claim* action, which is the sort of thing that misleads every reader who opens it.

- **The nine deprecated event aliases are removed.** `StakeEvent`, `DepositEvent`, `RedeemEvent`, `UnstakeEvent`, `DeployEvent`, `WithdrawEvent`, `BridgeEvent`, `StakeAndDeployEvent`, `DepositAndDeployEvent` and their `*Map` counterparts are gone; use `ActionEvent` / `ActionEventMap`. Wire values are untouched, so anything subscribing by string is unaffected.

- **`sdk.api.unstakes()` is now `sdk.api.withdrawals()`,** and `UnstakeOptions` is `WithdrawalOptions`. Same call, same arguments, same return type.

  The options object keeps its wire field names — `show_redeems`, `show_unstakes`, `to_native` — because those are the endpoint's query parameters, not the SDK's vocabulary. The returned record type stays `Unstake` for the same reason: it describes what the endpoint sends back, and renaming it would misdescribe the payload.

- **The React hooks follow the verbs.** `@lombard.finance/sdk-react` renames all four action hooks and the methods they return:

  | before | after |
  | --- | --- |
  | `useBtcStake().stake()` | `useBtcDeposit().deposit()` |
  | `useBtcStakeAndBake().stakeAndDeploy()` | `useBtcDeploy().deploy()` |
  | `useEvmUnstake().unstake()` | `useEvmWithdraw().withdraw()` |
  | `useNonEvmUnstake().unstake()` | `useNonEvmWithdraw().withdraw()` |

  `stakeAmount` becomes `depositAmount` on the two BTC hooks. The exported types move with them: `BtcStakeParams` → `BtcDepositParams`, `BtcStakeAndBakeParams` → `BtcDeployParams`, `EvmUnstakeParams` → `EvmWithdrawParams`, `NonEvmUnstakeParams` → `NonEvmWithdrawParams`, and the three status vocabularies — `Staking*`, `StakeAndBake*`, `Unstaking*` — become `Deposit*`, `Deploy*` and `Withdraw*`.

  No aliases here either. A hook is destructured at its call site, so a missing member is a compile error at the exact line that needs changing.

- **The asset a dispatching verb switches on is now typed as a literal.** `EvmUnstakeParams.assetIn` is `'LBTC'`, `EvmRedeemParams.assetIn` is `'BTC.b'`, the two Solana equivalents likewise, and the two BTC deploy params carry the matching `assetOut` literal.

  This fixes a silent type lie. `withdraw` was declared with three overloads, but `EvmUnstakeParams` and `EvmRedeemParams` were structurally identical, so the third was unreachable: a BTC.b withdrawal resolved to `IEvmUnstake` while returning an `EvmRedeem`. Only the BTC.b interface carries `approve()` and `needsApproval`, so the compiler rejected any use of them and the only way through was a cast. The verb-dispatch tests asserted the constructed class, which was correct all along; nothing asserted the type.

  (The BTC.b route does need an ERC-20 allowance, but the caller never drives it: `execute()` reads the allowance and submits the approval inline when it is short. `needsApproval` is `false` there for that reason, and `approve()` resolves without doing anything — see the fix below.)

  A caller passing `AssetId.LBTC` or `AssetId.BTCb` directly is unaffected and now gets the precise interface. A caller holding a runtime `AssetId` — a form, typically — matches a new fallback overload and receives the union to narrow:

  ```ts
  const action = evm.withdraw(paramsFromForm); // IEvmUnstake | IEvmRedeem
  if ('approve' in action) await action.approve();
  ```

  The runtime guards that reject an unroutable asset are unchanged; they are now unreachable from well-typed dispatching code, which is the point, and remain for callers with no types.

  **The deprecated verbs take the widened parameters**, deliberately. `unstake`, `redeem`, `stakeAndDeploy` and `depositAndDeploy` each build one known class, so they have no dispatching to do and no need of the discriminant — and narrowing them would break the callers they exist to keep working. The shape that matters is the common one: a params object built once with the method chosen by a boolean, so `assetIn` is a union of both literals and fits neither. Their return types stay precise, since the route is fixed by which name was called, and each still validates at runtime the asset its own route can serve.

### Added

- The route label now reaches telemetry, which is the point of having it.

  Every action exposes a `route` getter and the conformance suite checks that it does — but nothing read it, so it could not tell anyone which journey failed. It matters because one class now covers several: `EvmUnstake` runs both `lbtc-to-btc` and `lbtc-to-btcb`, so the class name in a log line no longer says what the line is about.

  Every log line an action emits now carries `route`, and a failure carries it into `toSentryContext()`. `LombardError.withContext()` is how — a copy with merged metadata rather than a mutation, keeping the original stack, because the useful frame is where the failure happened and an error that changes after it is thrown is a poor thing to debug from. Existing keys win: whatever raised the error knew more than the layer adding context.

- `walletAuth.signIn()` — the whole ceremony in one call: challenge, sign, verify, and poll when the chain settles on-chain.

  Consumers were building this on top of the three primitives, which meant each of them re-derived the sync/async branch. That branch is not a choice. An EOA on EVM, Solana or Sui is verified off-chain and the token is in the verify response; a Safe or a Starknet account is verified through a contract call and only yields a token once polled. A consumer handling only the first case works until the first contract wallet signs in, and then that user has produced a signature and holds no token — with no error to show for it.

  Signing stays with the caller, since the SDK holds no key material and every chain's wallets expose a different signing method:

  ```ts
  const { jwt, expiresAt } = await sdk.walletAuth.signIn({
    address,
    chain: walletAuthChainName(chainId),
    sign: async (payload) => ({ signature: await wallet.signMessage(payload) }),
  });
  ```

- `walletAuthChainName(chainId)` — the chain name the wallet-auth routes want, derived rather than hand-written.

  Those routes name chains a fourth way: not a viem chain id, not `DESTINATION_BLOCKCHAIN_*`, not `BLOCKCHAIN_*`, but the short `name` from `/v2/chains`. The name is load-bearing on the second call only — an EOA signature is ECDSA and verifies off-chain, but a smart-contract wallet is verified by an ERC-1271 call _on the named chain_, so a Safe that exists only on Base and is submitted as `ethereum` has no code at that address there and can never verify. The challenge call before it returns 200 either way, so the mistake surfaces one step later as an opaque failure.

  There is deliberately no env-suffixed form. The env already picks the gateway, and each gateway enumerates its own chains under the canonical name — testnet's `/v2/chains` lists `ethereum` at chain id 11155111. Suffixed aliases are accepted by the testnet host and rejected by mainnet, and the alias set is not the set of chain slugs used elsewhere in the SDK: `sonic` has no accepted testnet alias, so a slug-derived `sonic_blaze` is rejected by both hosts. One unsuffixed name per chain family is both simpler and the only form correct on every env. Unknown chains throw rather than falling back to Ethereum, because a wrong name is unrecoverable for a contract wallet and silent for an EOA.

### Fixed

- `createConfig` no longer discards `auth` and `getAuthToken`.

  `validateAndApplyDefaults` builds a fresh object rather than spreading its input, so every settable field has to be copied by hand — and both auth fields were missed. They passed the type check and were silently dropped, so a wallet token never reached a request made through `createLombardSDK`, the documented entry point. The bare chain facades threaded it correctly, which is why the plumbing test missed it: that test hands `LombardConfig` literals straight to the facades and never runs the builder.

- `sdk.walletAuth` — the wallet-auth service as a namespace, `null` when `walletAuthModule()` is not registered.

  `walletAuthModule`'s own `@example` already read `sdk.walletAuth.requestChallenge(…)` and the design assumed the same accessor, but the property did not exist: the service was only reachable through `capabilities.require('walletAuth')`. A documented call that cannot be made is worse than an undocumented one. `null` rather than a throw when the module is absent, because acquiring a token is optional — a consumer that only reads public data never needs one.

- `LombardConfig.auth`, an asynchronous wallet-token provider, replacing the synchronous `getAuthToken` (kept, deprecated, still honoured when `auth` is absent).

  ```ts
  const sdk = await createLombardSDK({
    env: Env.prod,
    auth: { getToken: async () => myStore.freshToken() },
  });
  ```

  Asynchronous because the token lives seven days: a synchronous accessor can only hand back what the host already holds, so a long-lived session eventually attaches an expired token and takes a 401 instead of refreshing. Making it a promise moves the refresh decision to the host, which owns the wallet and the signing UX. The SDK never stores the result — it asks per request, so a token acquired after construction is picked up without re-creating anything.

  Every outbound request declares a **scope**. `public` attaches a token when one is available and never requires one, which is what lets chain reads happen before a wallet is connected. `userScoped` requires one and fails locally without it, turning a 401 the caller has to interpret into a precondition they can check. A `userScoped` request that is rejected re-asks the provider and retries **once** — enough to distinguish an expired token from a revoked one without looping — then fires `onUnauthorized` and surfaces a typed `unauthorized` error.

  An explicit `Authorization` header still wins and is never refreshed, so `revokeWalletToken` sending the token it is invalidating, and any caller passing `walletJwt` directly, behave exactly as before.

- `AuthErrorCode` joins the error taxonomy with `missing-token` and `unauthorized`, so an auth failure carries a machine-readable code like every other SDK error.

- The v6 action contract is exported from the package root and from `@lombard.finance/sdk/core`: `ActionStatus`, `ActionSteps` and `ACTION_STEP_KEYS`, `ActionProgress`, the three parameter unions, the five action interfaces, `deriveRouteLabel`, `vaultAsset`, `resolveRegistryToken` and the status predicates.

  It existed, compiled and was tested before this, and was reachable from no entry point — the tests import it by relative path, so nothing noticed. The export-surface snapshot guards against names disappearing, not against a module never being wired up.

  `EvmDeployStatus` is the one member held back. 5.x already exports that name as an alias of `EvmOperationStatus`, and the v6 narrowing describes the same concept with fewer members; exporting both is a duplicate identifier, and silently swapping the meaning would change what a consumer's type admits with no error at their call site. It lands with the EVM classes in stage D as a named breaking change.

- `evm.withdraw()` now serves the asset routes as well as the vault exit, absorbing `unstake()` and `redeem()`. **The vault arm is unchanged**, so no existing call moves: a call passing `protocol` behaves exactly as it did in 5.x. The asset arms are new and dispatch on `assetIn` — LBTC burns LBTC for BTC or BTC.b, BTC.b redeems for BTC.

  It is overloaded rather than returning a union, so a caller gets the precisely-typed action. That matters because the arms have different terminals: `EvmWithdrawStatus` carries `completed` and no `queued`, `EvmVaultWithdrawStatus` carries `queued` and no `completed`. Comparing against the wrong one is a compile error instead of a UI reporting an unsettled withdrawal as done — which is what 5.x did, silently.

  The arms are separated on whether `assetIn` is present at all, not on whether `protocol` is: a vault exit burns shares that have no `AssetId`, and that absence is the durable distinction.

- `evm.claim()`, the new name for what `evm.deposit()` has always done.

  **`deposit` is deliberately not reassigned in this major.** Under the three-verb model it should name the BTC.b-to-LBTC route that `stake()` serves, but `EvmDepositParams` and `EvmStakeParams` are structurally identical — both `{ assetIn, assetOut, sourceChain, destChain }`. Reassigning the name would hand an existing caller a different action, and because the parameters are indistinguishable neither the compiler nor a runtime guard could detect it. `deposit` therefore keeps its 5.x meaning and the name is only free once the alias is removed.

- The three-verb facade methods, on the chains where the new name was free. `btc.deploy()`, `solana.deposit()`, `solana.withdraw()`, `sui.withdraw()` and `starknet.withdraw()`. Every old method still works and is deprecated.

  Two of these merge a pair, and the merged method dispatches on the parameter that actually distinguished them rather than asking the caller to pick a class:
  - `btc.deploy({ assetOut })` — LBTC routes through the ratio-adjusted path, BTC.b through the 1:1 one.
  - `solana.withdraw({ assetIn })` — LBTC burns LBTC, BTC.b redeems through the Asset Router.

  An asset with no route throws at the call. Dispatching to a class arbitrarily would fail later instead, inside a flow the caller has already started and possibly after a signature.

- Every action exposes `route`, naming which journey the instance is running. After the merges one class covers several — `BtcDeposit` covers four and `EvmWithdraw` two — so `constructor.name` no longer identifies what failed, which matters because `LogMeta` carries this into `toSentryContext()` during exactly the window partners are filing migration bugs.

  The label is derived from the parameters rather than declared per class, so it cannot drift from the route it describes, and `vaultAsset()` reads a vault's denomination out of `DEFI_REGISTRY` so a protocol added there is labelled without a second edit. An unknown combination throws: a label appears in a log as fact, so guessing one is worse than failing.

- Every action exposes `applicableSteps`, the ordered subset of the five progress steps its route actually uses. Progress always carries all five keys, `idle` for the inapplicable ones — filtering the payload instead would leave `steps.settling` typed `StepStatus` but valued `undefined`, and since every known reader uses named access that comparison would be false forever. `applicableSteps` is how a consumer knows which of the five to render.

  It is derived rather than declared: `authorizing` comes from whether the route has any authorization ceremony, and the rest from the route family, so the two cannot disagree. Bitcoin-source routes add `awaitingFunds` — the state with no chain-source equivalent, where the deposit address exists and the SDK is waiting for the user to send Bitcoin — and `settling` for the notarisation that follows.

- `deriveRouteLabel()` names a journey from its assets and protocol. After the merges one class covers several journeys, so `constructor.name` no longer identifies what failed; the label is derived from the parameters rather than declared per class, so it cannot drift from what it describes. An unknown combination throws rather than inventing a label that would then appear in logs as fact.

- Every action now has `authorize()`. Four spellings existed across the sixteen classes — `approve()`, `authorizeFee()`, `confirmAddress()` and `authorizeDeposit()` — and each threw when called at the wrong point. Which one applies is a property of the route and the chain, so working it out was effort every integrator had to repeat: on EVM it depends on whether the chain is subsidised and whether an allowance is outstanding, on BTC it depends on the destination, and on Solana, Sui and Starknet there is no ceremony at all.

  `authorize()` dispatches on status, which is already the record of what is outstanding, so it is idempotent: calling it twice costs one signature, and a retry after a partial failure resumes rather than replaying. On the chains with no ceremony it is a documented no-op, so one flow can call it unconditionally instead of branching per chain.

  Every old method still works and is deprecated. Dropping them is deferred to the next major.

- The BTC deploy actions gain `authorize(options?)`, and `expiry` is reachable for the first time. `signStakeAndBake()` has always accepted a signature expiry and defaulted to 24 hours, but no caller could set one: the field was missing from `SignStakeAndBakeParams`, so neither `EvmService` nor either deploy config could forward it, and `authorizeDeposit()` took no arguments at all. Every consumer going through `btc.stakeAndDeploy()` or `btc.depositAndDeploy()` was pinned to 24 hours.

  ```ts
  await action.prepare({ amount: '0.1', recipient: '0x...' });
  await action.authorize({ expiry: Math.floor(Date.now() / 1000) + 7 * 86400 });
  ```

  `expiry` is an absolute UNIX timestamp in seconds, matching the low-level parameter it forwards to, so no second unit convention enters the SDK. Omitting it passes `undefined` all the way down rather than computing a default en route, so the 24-hour fallback stays in one place. Silo BTC.b signs with a zero deadline, so the option is accepted there for interface parity and has no effect on that route.

  `authorizeDeposit()` remains as a deprecated delegator and takes the same options. Dropping it is deferred to the next major.

- `sdk.chain.btc.deposit()` actions gain `authorize()`, which runs whichever authorization ceremony the route needs. `authorizeFee()` and `confirmAddress()` were the two halves of one ceremony, split across two methods that each threw when called on the wrong route — and which one applies is decided by the destination, not the caller, so every integrator had to rediscover the mapping per chain. `authorize()` reads it from the route.

  Both old names remain as deprecated delegators with their guards intact: `authorizeFee()` on a subsidised destination still throws rather than quietly signing an address, and `confirmAddress()` on Ethereum still throws rather than skipping the fee signature. `BtcStake` already exposed exactly this method, so the two BTC deposit routes now have one shape. Dropping the old names is deferred to the next major.

- `LombardConfig.getAuthToken` — an optional `() => string | undefined` the SDK reads when building a request. It reaches every action context and every api-function, which now inherit it through `IEnvParam` alongside `env`. Supplying it changes nothing today: no endpoint requires a token, and when the accessor is absent or returns `undefined` no `Authorization` header is sent. It exists so that when the backend does require one, the change is one place rather than 23. The SDK stays stateless about the token — it never stores or refreshes one, and reads the accessor at call time so a token acquired after construction is still seen.

- `ActionEvent` and `ActionEventMap` are exported from the package root and from `@lombard.finance/sdk/core`, alongside `StrategyEventHandlerMap` — which `ActionEventMap` must extend and which consumers extending the map need to reference. `WithdrawEvent` and `WithdrawEventMap` are exported for the first time; they were declared but reachable from no entry point, even though `evm.withdraw()` is public.
- `sdk.chain.btc.stakeAndDeploy()` now rejects an `assetIn` other than `AssetId.BTC` at construction. `assetIn` selects the `DEFI_REGISTRY` entry and therefore the amount-conversion strategy; because `AssetId.LBTC` and `Token.LBTC` are the same string, passing `AssetId.LBTC` silently selected `identity` and authorized the **raw satoshi amount** instead of the ratio-adjusted LBTC amount. Only native BTC is a valid source for this action, so any other value is now an `INVALID_ASSET` error rather than a signature over the wrong figure.
- `@lombard.finance/sdk/evm` now exports the withdraw and cancel-withdraw types — `IEvmWithdraw`, `IEvmCancelWithdraw`, `EvmWithdrawParams`, `EvmWithdrawPrepareParams`, `EvmWithdrawProgress`, `EvmWithdrawStatus`. They were exported from the package root but never from the `./evm` subpath, so a consumer importing from `@lombard.finance/sdk/evm` could not reach any of them even though `evm.withdraw()` is public.

### Fixed

- Every api-function now reaches the network through `utils/http`. There were 16 raw `axios.get`/`axios.post` calls across 15 files, while the centralised wrapper — publicly exported from both the package root and `@lombard.finance/sdk/core` — had **zero callers inside the package it ships from**. So the SDK version headers it adds were not actually being sent by any api-function, and there was no single place to attach an auth header. Both are now true.

- `sdk.chain.evm.deploy()` now deposits the asset it was given. `EvmDeployParams.asset` was accepted and never read: `params.asset` appeared zero times in the class and all four call sites hardcoded `Token.LBTC`, so `deploy({ asset: AssetId.BTCb })` resolved cleanly and then deposited **LBTC**. A caller who named one asset got another, with no error. The four literals are replaced by one private accessor deriving the token from `params.asset`, so the sites cannot drift apart again.

  This also means "deploy supports BTC.b" was never true. Adding a `DEFI_REGISTRY` cell for BTC.b would not have made it true on its own, because the class would still have looked up LBTC.

- `sdk.chain.btc.stakeAndDeploy()` no longer throws `INVALID_STATE` on the documented call sequence when a deposit is resumed. `prepare()` can legitimately finish in `ADDRESS_READY` — a returning user whose deposit address and vault signature already exist server-side — but `authorizeDeposit()` rejected that status, and `generateDepositAddress()` asserted `READY` _before_ checking whether it already held an address. Both now accept the resumed state: `authorizeDeposit()` is a no-op (authorization is already complete) and `generateDepositAddress()` returns the held address without a further API call. Callers that guarded on `depositAddress` and returned early were unaffected; callers following the sequence in the SDK's own documentation were not.
- The same resume path no longer marks itself authorized when the server returns signature _metadata_ without the signature itself. `restoreStakeAndBakeSignature()` intentionally reports `hasSignature: true` when only an expiry is available, which meant `generateDepositAddress()` could post `signature: undefined` to the deposit-address endpoint. A stored signature now requires the signature string to be present; otherwise the action falls through to re-authorization. Note the endpoint does not return `typedData`, so `signatureData` remains absent on this path — unchanged, and accepted by the API.
- BTC actions that omit the optional `sourceChain` now monitor the Bitcoin network matching their environment. `bitcoinNetwork` read the raw parameter, so a production caller who left `sourceChain` unset monitored the Bitcoin **testnet** and waited for confirmations that could never arrive. Source chain is now resolved once (prod → mainnet, every other environment → signet) and validation, monitoring and deposit lookup all read that single value.

---

# 5.5.0

### One-Signature Permit Authorisation

A stake-and-bake deposit needed two things from the user: an ERC-2612 permit authorising the vault spender, and proof that they control the destination address so a BTC deposit address could be issued for it. The v1 deposit-address route took the permit signature as that proof, but a permit is submitted on chain and readable in the mint calldata, so it is not private and the route now refuses a signature it has already seen. Doing it properly over the v2 route meant a second, separate signature.

The wallet-auth challenge can now carry the permit itself. One signature does both jobs: the server issues the permit as EIP-712 typed data, the wallet signs it, and verification returns a JWT _and_ records the permit for the claimer.

```ts
import {
  signPermitChallenge,
  resolveDepositBtcAddress,
  Token,
} from '@lombard.finance/sdk';

const { jwt, signatureExpiresAt } = await signPermitChallenge({
  account,
  chainId: ChainId.ethereum,
  provider,
  value: '99512', // token base units
  deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
});

const depositAddress = await resolveDepositBtcAddress({
  address: account,
  chainId: ChainId.ethereum,
  token: Token.LBTC,
  walletJwt: jwt,
});
```

No separate call is needed to store the permit.

### Added

- `signPermitChallenge()` runs the whole ceremony: request a permit challenge, sign it, exchange it for a JWT, polling when the wallet verifies asynchronously. It returns the JWT alongside the signed payload and `signatureExpiresAt`, the permit deadline the server settled on.
- `requestWalletChallenge()` accepts `challengeType` plus `permit` / `feeApproval` params, and returns `challengeType`, `digest` and `signatureExpiresAt`.
- `verifyWalletSignature()` accepts `challengeType`.
- `WALLET_CHALLENGE_TYPE`, `WalletChallengeType`, `PermitChallengeParams` and `FeeApprovalChallengeParams` are re-exported from the package root, so naming a challenge type does not require depending on `@lombard.finance/sdk-common` directly.
- `ActivePermitExistsError` (`code: 9`, with the existing signature's `expiresAt` when the pre-check raised it) — thrown when a wallet already holds an active stake-and-bake signature, so a permit challenge cannot be redeemed.

### Fixed

**A millisecond `expiry` was accepted by `signStakeAndBake`, and set a permit deadline that never lapses.**

The existing checks reject an `expiry` that is not a whole number of seconds, and one that is not in the future. `Date.now()` passed unconverted is neither: it is a positive safe integer, and it is in the future. It cleared both checks and the deadline landed roughly 56,000 years out.

Nothing failed at any point. The permit signed, the signature was stored, and what the caller had granted was a spending allowance to the vault spender that does not expire — from one missing division. Of the ways an `expiry` can be wrong this is the only one with no downstream symptom: a fractional value throws from `BigInt()`, and a past value fails when the permit is used on chain.

`expiry` must now also be no more than **365 days** ahead. Generous enough that no real authorisation window approaches it, small enough that a millisecond timestamp cannot pass. When the magnitude matches, the error names the mistake rather than just citing the bound:

```text
expiry looks like milliseconds: 1787588525408 is ~1000x the current time in
seconds (1787588525), which would set the permit deadline to the year 58616.
It is an absolute UNIX timestamp in seconds — divide by 1000.
```

Anyone who called `authorizeDeposit({ expiry })` on `5.4.0` with a millisecond value should treat the resulting permit as an open-ended approval and let it be spent or replaced.

The bound is client-side. A request built without the SDK is unaffected by it.

### Notes

- **The permit is built server-side.** It reads `nonces(owner)` from the token and picks the deadline, because a client-chosen nonce and a predictable deadline are what make a published signature replayable. `deadline` is a request; the server may shorten it. Do not assemble the typed data locally.
- **The payload reaches the wallet as the exact string the server returned.** It is the JSON the server hashed, and re-serialising it can move the digest off the one it reserved. `signPermitChallenge` recomputes the digest and throws before prompting if it does not match.
- **`challengeType` is sent again on verify.** Challenges are stored per address and type, so omitting it looks up a plain-text challenge that was never issued.
- **A wallet that already holds an active signature never reaches the prompt.** The gateway issues a permit challenge regardless of one being on file and only refuses at verify, after the user has signed a real permit that is then discarded. For a returning user that is the default state for the lifetime of their previous permit, so `signPermitChallenge` looks the record up first and throws `ActivePermitExistsError` before prompting. Fall back to the plain wallet challenge on it, which issues a JWT without a second permit. The same error is raised from `verifyWalletSignature` when the API reports code `9`, so the case stays branchable if the pre-check is bypassed. A lookup that itself fails is treated as nothing being on file: blocking a first-time user on an unrelated outage is a worse trade than the wasted prompt this avoids.
- **A wallet rejection arrives as an `Error`.** Wallets reject with an EIP-1193 object rather than an `Error`, so an unwrapped rejection reached callers as `[object Object]` once stringified. It is normalised the same way as the two API calls in the flow.
- A challenge requested without the params its type requires is rejected at the call site. The gateway does not refuse it — it answers with the plain-text payload, which a wallet signs happily and the server then rejects.
- `signStakeAndBake()` is unchanged and still builds the permit locally for the v1 route.

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

On routes with a non-zero deadline, an `expiry` is rejected with an `INVALID_PARAMETER` error before anything reaches the network if it is not a positive whole number of seconds, or if it is not in the future. The first catches a fractional value — what `Date.now() / 1000` produces without a `Math.floor` — which `BigInt()` would otherwise turn into a `RangeError` from inside the permit build. The second catches a relative duration (`7 * 24 * 60 * 60` puts the deadline in 1970) and a stale timestamp; both would otherwise sign and store successfully and only fail when the permit was used on chain.

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
