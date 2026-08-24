# Migrating to `@lombard.finance/sdk` 6.0.0

> 6.0.0 collapses nine overlapping action verbs into three, requires a wallet token for per-account reads, and fixes two type-level defects that were silently degrading what your compiler could see. This guide shows the per-symbol migration with runnable code blocks.

End users with on-chain positions are unaffected. Most consumers do a mechanical migration once; two changes need a decision rather than a rename, and both are marked below.

Every old verb still works as a deprecated delegator, so you can migrate incrementally. If you need more time, stay on `^5.4.0`.

---

## The three verbs

Nine verbs described the same three journeys. Which one you called depended on the asset and the chain rather than on what you were doing, so the same intent had a different name per route.

| Verb       | What it means                                 | Replaces                                                      |
| ---------- | --------------------------------------------- | ------------------------------------------------------------- |
| `deposit`  | An asset becomes its L-asset                  | `stake` (Solana)                                              |
| `withdraw` | An L-asset becomes the asset, or a vault exit | `unstake`, `redeem` (EVM, Solana, Sui, Starknet)              |
| `deploy`   | An asset becomes a protocol position          | `stakeAndDeploy`, `depositAndDeploy` (BTC)                    |
| `claim`    | A pending BTC.b deposit is claimed as LBTC    | `deposit` (EVM) — see [the one that cannot move](#evmdeposit) |

`cancelWithdraw` is unchanged.

### `unstake` / `redeem` → `withdraw`

`withdraw` dispatches on `assetIn`, which is what distinguished the two calls anyway.

```ts
// Before (5.x)
const unstake = sdk.chain.evm.unstake({
  assetIn: AssetId.LBTC,
  assetOut: AssetId.BTC,
  sourceChain: Chain.ETHEREUM,
  destChain: Chain.BITCOIN_MAINNET,
});

const redeem = sdk.chain.evm.redeem({
  assetIn: AssetId.BTCb,
  assetOut: AssetId.BTC,
  sourceChain: Chain.AVALANCHE,
  destChain: Chain.BITCOIN_MAINNET,
});

// After (6.0.0)
const unstake = sdk.chain.evm.withdraw({
  assetIn: AssetId.LBTC, // → IEvmUnstake
  assetOut: AssetId.BTC,
  sourceChain: Chain.ETHEREUM,
  destChain: Chain.BITCOIN_MAINNET,
});

const redeem = sdk.chain.evm.withdraw({
  assetIn: AssetId.BTCb, // → IEvmRedeem
  assetOut: AssetId.BTC,
  sourceChain: Chain.AVALANCHE,
  destChain: Chain.BITCOIN_MAINNET,
});
```

The same applies to `sdk.chain.solana`. On Sui and Starknet there was only ever one withdrawal, so `withdraw` takes the same parameters `unstake` did.

`sdk.chain.evm.withdraw` also keeps its 5.x meaning — a vault exit — when you pass a `protocol` and no `assetIn`. The absence of `assetIn` is what separates the arms, because the shares a vault exit burns have no `AssetId`:

```ts
// Unchanged from 5.x
const exit = sdk.chain.evm.withdraw({
  protocol: DeployProtocol.Veda,
  sourceChain: Chain.ETHEREUM,
  recipient: userAddress,
});
```

### `stakeAndDeploy` / `depositAndDeploy` → `deploy`

`deploy` dispatches on `assetOut`, the intermediate asset the route passes through.

```ts
// Before
const viaLbtc = sdk.chain.btc.stakeAndDeploy({ ... });
const viaBtcb = sdk.chain.btc.depositAndDeploy({ ... });

// After
const viaLbtc = sdk.chain.btc.deploy({
  assetOut: AssetId.LBTC, // → IBtcStakeAndDeploy
  destChain: Chain.ETHEREUM,
  protocol: DeployProtocol.Veda,
});

const viaBtcb = sdk.chain.btc.deploy({
  assetOut: AssetId.BTCb, // → IBtcDepositAndDeploy
  destChain: Chain.AVALANCHE,
  protocol: DeployProtocol.Silo,
});
```

The two routes differ in whether the signed amount is ratio-adjusted, so passing an asset with no vault route throws rather than picking one.

### `solana.stake` → `solana.deposit`

A pure rename; the parameters are identical.

### <a id="evmdeposit"></a>`evm.deposit` → `evm.claim`, and why `deposit` did not move

`evm.deposit` claims a pending BTC.b deposit as LBTC. Under the three-verb model that is a `claim`, so `claim` is the new name and `deposit` is deprecated.

`evm.deposit` was **not** reassigned to mean "asset becomes L-asset" in this major, even though that is what `deposit` means everywhere else. `EvmDepositParams` and `EvmStakeParams` are structurally identical, so neither the compiler nor a runtime guard could tell a caller's intent apart — reassigning the name would silently swap which action a working call constructs. It moves in the next major, once the parameter types diverge.

---

## Reads now need a wallet token

Two per-account routes are keyed by an address and now require a wallet-signature JWT:

- `getEarnDeposits`
- `getEarnWithdrawals`

They were previously sent anonymously and the gateway allowed it. That allowance is being withdrawn, so the alternative to failing locally is a 401 later. They now fail before sending, with a `missing-token` error naming the config field that fixes it.

Aggregate reads — APY, TVL, points, per-vault performance — are unaffected.

### Supply the token

```ts
const sdk = await createLombardSDK({
  env: Env.prod,
  providers: { evm: () => window.ethereum },
  auth: {
    getToken: async () => myStore.freshToken(),
    onUnauthorized: () => myStore.clear(),
  },
});
```

`getToken` is asynchronous so you can refresh. It is called per request, so a token acquired after the SDK is built is picked up without rebuilding it. Return `undefined` when you have no token: public routes still work, and only the per-account ones fail.

The synchronous `getAuthToken` still works and is deprecated. It could only hand back whatever you already held, which at a seven-day token lifetime means every long-lived session eventually attaches an expired token and takes a 401 instead of refreshing.

### Get a token in one call

```ts
const { jwt, expiresAt } = await sdk.walletAuth.signIn({
  address,
  chain: walletAuthChainName(chainId),
  sign: async (payload) => ({ signature: await wallet.signMessage(payload) }),
});
```

`signIn` runs challenge → sign → verify, and polls when the wallet is verified on chain. That branch is a property of the wallet, not a choice: an EOA on EVM, Solana or Sui is verified off-chain and the token is in the verify response, while a Safe or a Starknet account is verified through a contract call and only yields a token once polled. Handling only the first case works until the first contract wallet signs in, and then that user holds a signature and no token.

Signing stays with you — the SDK holds no key material, and every chain's wallets expose a different signing method.

`walletAuthChainName(chainId)` gives you the chain name those routes want, which is none of the three chain vocabularies the SDK already uses. It matters on the verify call: an EOA signature is ECDSA and verifies off-chain, but a contract wallet is verified by an ERC-1271 call _on the named chain_, so a Safe that exists only on Base and submitted as `ethereum` can never verify — and the challenge call before it returns 200 either way. Pass the wallet's actual connected chain.

---

## Two type-level fixes that may surface new errors

Both of these make your compiler see things it could not see before. If either produces new errors in your code, the errors were already latent.

### The shipped declarations no longer resolve to `any`

The build wrote one bundle per export subpath as `dist/<name>.js` beside a declaration tree at `dist/<name>/`, so every internal reference to `core`, `utils`, `vaults`, `metrics`, `defi`, `bridge`, `contracts` or `strategies` inside a `.d.ts` resolved to the JavaScript file and fell back to `any`.

`skipLibCheck: true` — the default in the Vite, Next and CRA templates — suppresses exactly those errors while leaving the types degraded, which is why it was invisible. Declarations now emit to `dist/types`. Import paths are unchanged; only the location of the declaration files inside the package moved.

**What you may see:** real type errors in code that was type-checking against `any`. In our own playground this surfaced three latent bugs, including a reference to a chain the SDK had removed.

### The asset a dispatching verb switches on is typed as a literal

`EvmUnstakeParams.assetIn` is now `'LBTC'` rather than `AssetId`, `EvmRedeemParams.assetIn` is `'BTC.b'`, and the Solana and BTC equivalents match.

This was load-bearing. The two parameter types were structurally identical, so `withdraw`'s redeem overload was unreachable: a BTC.b withdrawal resolved to `IEvmUnstake` while returning an `EvmRedeem`. `IEvmRedeem` carries `approve()` and `needsApproval` and `IEvmUnstake` does not, so the compiler forbade the ERC-20 approval that route requires.

Passing `AssetId.LBTC` or `AssetId.BTCb` directly needs no change and now gets the precise interface. If your asset is only known at runtime — from a form, typically — you match a fallback overload and get the union to narrow:

```ts
const action = sdk.chain.evm.withdraw(paramsFromForm); // IEvmUnstake | IEvmRedeem

if ('approve' in action) {
  await action.approve();
}
```

---

## Also removed

The nine per-operation event vocabularies are one. `StakeEvent`, `DepositEvent`, `RedeemEvent`, `UnstakeEvent`, `DeployEvent`, `WithdrawEvent`, `BridgeEvent`, `StakeAndDeployEvent` and `DepositAndDeployEvent` declared identical members; they collapse to `ActionEvent` / `ActionEventMap`. **Wire values are unchanged**, so `action.on('progress', …)` behaves exactly as before, and all nine old names remain as deprecated aliases — `StakeEvent === ActionEvent` holds.

---

## The deposit-address flow

`resolveDepositBtcAddress` derives the address from the authenticated session, so no signature ceremony is needed. It is the path to build on.

The signature-based path — `generateDepositBtcAddress`, and `getDepositBtcAddress` for reading back what it produced — is still exported and still works. It is on its way out with the gateway allowance it depends on, so treat it as deprecated even where the type is not yet marked, and move new work to `resolveDepositBtcAddress`.

```ts
// Prefer this
const address = await resolveDepositBtcAddress({
  /* … */
});
```

## What didn't change

- Every old verb still works, as a deprecated delegator to the new one. Nothing forces a same-day migration.
- `evm.stake`, `evm.deploy`, `btc.stake` and `btc.deposit` keep their names and meanings.
- Event names and payloads on the wire.
- Contract interactions. The ABI method names this package calls are pinned by a test, precisely because a verb rename could otherwise reach one.
- Route labels (`lbtc-to-btc`, `btcb-to-vault`, …), which are analytics keys with history behind them.
- Aggregate read helpers, which stay anonymous.

## Need help?

- File an issue at https://github.com/lombard-finance/sdk/issues
- Check the [CHANGELOG](./CHANGELOG.md) for the full breaking-change list.
