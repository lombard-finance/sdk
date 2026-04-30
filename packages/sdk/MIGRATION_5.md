# Migrating to `@lombard.finance/sdk` 5.0.0

> 5.0.0 removes the five vault-shaped functions deprecated in 4.8.0 plus the two deprecated `getEarnPosition` response field aliases. This guide shows the per-symbol migration with runnable code blocks.

End users with on-chain positions are unaffected. SDK consumers do a mechanical migration once.

If you need more time, stay on `^4.8.0` (still on npm with runtime deprecation warnings).

---

## Reads: positions and exchange rate

### `getSharesByAddress` → `getEarnPosition`

```ts
// Before (4.8.0)
import { getSharesByAddress, Vault } from '@lombard.finance/sdk';

const { balance, exchangeRate, balanceLbtc } = await getSharesByAddress({
  address: userAddress,
  chainId: 1,
  vaultKey: Vault.Veda,
});

// After (5.0.0)
import { getEarnPosition } from '@lombard.finance/sdk';

const position = await getEarnPosition({
  address: userAddress,
  chainId: 1,
});

const balance = position.underlyingShares;
const { exchangeRate, position: balanceLbtc } = position;
// Or read .totalShares for the combined view (underlyingShares + BTCe shares
// converted via the wrapper's convertToAssets), and .position for the
// LBTC-denominated total.
```

### `getShareValue` → `getEarnPosition().exchangeRate`

```ts
// Before
import { getShareValue, Vault } from '@lombard.finance/sdk';

const rate = await getShareValue({ chainId: 1, vaultKey: Vault.Veda });

// After
import { getEarnPosition } from '@lombard.finance/sdk';

const { exchangeRate } = await getEarnPosition({
  address: userAddress, // an address is required; pass the user or any non-zero address
  chainId: 1,
});
```

### Response field reads

```ts
// Before
const { lbtcvShares, btceSharesInLbtcv } = await getEarnPosition({ ... });

// After
const { underlyingShares, btceSharesInUnderlying } = await getEarnPosition({ ... });
```

This is a runtime-shape break, not just a type rename. Destructuring `.lbtcvShares` returns `undefined` in 5.0.0 even in plain JavaScript.

---

## Writes: deposits, withdrawals, cancellations

### `deposit` → `depositEarn`

```ts
// Before
import { deposit, Token, Vault } from '@lombard.finance/sdk';

const txHash = await deposit({
  amount: '0.1',
  token: Token.LBTC,
  vaultKey: Vault.Veda,
  account: userAddress,
  chainId: 1,
  provider: window.ethereum,
});

// After
import { depositEarn, Token } from '@lombard.finance/sdk';

const txHash = await depositEarn({
  amount: '0.1',
  token: Token.LBTC, // Token.wBTC, Token.cbBTC, etc. also accepted
  account: userAddress,
  chainId: 1,
  provider: window.ethereum,
});
```

`depositEarn` deposits through the BTCe wrapper, so the resulting shares are BTCe rather than the underlying-vault token. Behavior is otherwise equivalent. Approval to the BTCe contract is handled internally; opt out with `approve: false` if you've already approved.

### `queueWithdraw` → `withdrawEarn`

```ts
// Before
import { queueWithdraw, Token, Vault } from '@lombard.finance/sdk';

const txHash = await queueWithdraw({
  amount: '0.05',
  token: Token.LBTC,
  vaultKey: Vault.Veda,
  account: userAddress,
  chainId: 1,
  provider: window.ethereum,
});

// After
import { withdrawEarn } from '@lombard.finance/sdk';

const result = await withdrawEarn({
  amount: '0.05',
  // withdrawalAsset?: Token.LBTC (default) — accepts Token.wBTC, Token.cbBTC, etc.
  account: userAddress,
  chainId: 1,
  provider: window.ethereum,
});

// result is { approveTxHash?, unwrapTxHash?, queueTxHash } — see below.
```

`withdrawEarn` is a single call but may issue 1–3 transactions depending on user state:
1. **Approve** underlying-share token to the withdraw queue (skipped if allowance covers).
2. **Unwrap** just enough BTCe to cover the requested amount (skipped if the user's direct underlying balance covers, or on chains where BTCe is not deployed).
3. **Queue** the withdrawal (always).

The return value reports which steps ran. To predict the steps before signing, call `previewWithdrawEarn`:

```ts
import { previewWithdrawEarn } from '@lombard.finance/sdk';

const preview = await previewWithdrawEarn({
  amount: '0.05',
  account: userAddress,
  chainId: 1,
});
// { steps: ['approve', 'unwrap', 'queue'], expectedPopups: 3, isCovered, isUnwrappable, ... }
```

### `cancelWithdraw` → `cancelEarnWithdrawal`

```ts
// Before
import { cancelWithdraw, Token, Vault } from '@lombard.finance/sdk';

await cancelWithdraw({
  token: Token.LBTC,
  vaultKey: Vault.Veda,
  account: userAddress,
  chainId: 1,
  provider: window.ethereum,
});

// After
import { cancelEarnWithdrawal, Token } from '@lombard.finance/sdk';

await cancelEarnWithdrawal({
  withdrawalAsset: Token.LBTC, // optional, defaults to Token.LBTC
  account: userAddress,
  chainId: 1,
  provider: window.ethereum,
});
```

Same underlying contract call. Atomic-request cancellations are indexed per `(user, vault, withdrawalAsset)`, so use the asset that was originally queued.

---

## Removed parameter types

The following exported types are removed. New parameter types follow the new function names:

| Removed | New |
|---|---|
| `DepositParameters` | `DepositEarnParameters` |
| `QueueWithdrawParameters` | `WithdrawEarnParameters` |
| `CancelWithdrawParameters` | `CancelEarnWithdrawalParameters` |
| `IGetSharesByAddressParameters`, `IGetShareValueParameters` | `IGetEarnPositionParameters` |

---

## What didn't change

- The `Vault` enum is still exported (used by `previewVaultDeposit`, `getVaultDeposits*`, `getVaultMinimumDeposit`, `getVaultApy`, `getVaultPoints`, `getVaultTVL`, none of which were deprecated).
- BFF-backed helpers (`getVaultDeposits*`, `getVaultWithdrawals*`, `getVaultApy`, `getVaultPoints`, `getVaultTVL`) keep working unchanged. They were not deprecated in 4.8.0.
- The chain-action APIs (`evmActions.deploy`, `evmActions.withdraw`, etc.) keep working unchanged. They internally use the helpers that were renamed to `*Internal`, so behavior is identical.
- `previewVaultDeposit` and `getVaultMinimumDeposit` keep working unchanged.

## Need help?

- File an issue at https://github.com/lombard-finance/sdk/issues
- Check the [CHANGELOG](./CHANGELOG.md) for the full breaking-change list.
