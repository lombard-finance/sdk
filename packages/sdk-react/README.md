# @lombard.finance/sdk-react

React hooks for the [Lombard SDK](https://docs.lombard.finance).

## Installation

```bash
npm install @lombard.finance/sdk-react @lombard.finance/sdk
# or
yarn add @lombard.finance/sdk-react @lombard.finance/sdk
```

React 18+ is required as a peer dependency.

## Hooks

### `useLombardSDK(configFn, deps)`

Initializes a `LombardSDK` instance. Accepts a factory function that returns a `LombardConfig` or `undefined` (when the wallet is not yet connected). Re-initializes whenever `deps` changes.

```ts
import { createConfig } from '@lombard.finance/sdk';
import { useLombardSDK } from '@lombard.finance/sdk-react';

const { sdk, isInitializing, error } = useLombardSDK(
  () =>
    window.ethereum
      ? createConfig({ env, providers: { evm: () => window.ethereum! } })
      : undefined,
  [env],
);
```

### `useBtcDeposit(sdk)`

BTC → LBTC or BTC.b. `btc.deposit()` dispatches on `assetOut`, so one hook covers both. Manages the full lifecycle: `prepare → authorize (if needed) → generateDepositAddress`, and subscribes to `status-change` and `progress` for confirmation tracking.

```ts
const {
  deposit,
  reset,
  depositAddress,
  depositAmount,
  status,
  progress,
  error,
  isLoading,
} = useBtcDeposit(sdk);

await deposit({ amount, destChain, sourceChain, assetOut, recipient });
```

### `useBtcDeploy(sdk)`

BTC straight into a DeFi vault position. Lifecycle: `prepare → authorizeDeposit (if needed) → generateDepositAddress`.

```ts
const {
  deploy,
  reset,
  depositAddress,
  depositAmount,
  status,
  progress,
  error,
  isLoading,
} = useBtcDeploy(sdk);

await deploy({ amount, destChain, sourceChain, protocol, recipient });
```

### `useEvmWithdraw(sdk)`

Burns LBTC or BTC.b on an EVM chain. Lifecycle: `prepare → authorizeFee (if needed) → execute`. Returns `txHash` on completion.

```ts
const { withdraw, reset, txHash, status, error, isLoading } =
  useEvmWithdraw(sdk);

await withdraw({ amount, sourceChain, destChain, assetOut, recipient });
```

### `useNonEvmWithdraw(sdk, chainNamespace)`

Burns LBTC on Solana, Starknet, or Sui. Lifecycle: `prepare → execute`.

```ts
const { withdraw, reset, txHash, status, error, isLoading } =
  useNonEvmWithdraw(sdk, 'solana');

await withdraw({ amount, sourceChain, destChain, recipient });
```

## License

MIT
