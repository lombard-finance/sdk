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

### `useBtcStake(sdk)`

BTC → LBTC staking. Manages the full lifecycle: `prepare → authorize (if needed) → generateDepositAddress`. Subscribes to `status-change` and `progress` events for real-time confirmation tracking.

```ts
const { stake, reset, depositAddress, stakeAmount, status, progress, error, isLoading } =
  useBtcStake(sdk);

await stake({ amount, destChain, sourceChain, assetOut, recipient });
```

### `useBtcStakeAndBake(sdk)`

BTC → LBTC → Vault (stake-and-deploy). Lifecycle: `prepare → authorizeDeposit (if needed) → generateDepositAddress`.

```ts
const { stakeAndBake, reset, depositAddress, stakeAmount, status, progress, error, isLoading } =
  useBtcStakeAndBake(sdk);

await stakeAndBake({ amount, destChain, sourceChain, protocol, recipient });
```

### `useEvmUnstake(sdk)`

LBTC burn on EVM chains. Lifecycle: `prepare → authorizeFee (if needed) → execute`. Returns `txHash` on completion.

```ts
const { unstake, reset, txHash, status, error, isLoading } = useEvmUnstake(sdk);

await unstake({ amount, sourceChain, destChain, assetOut, recipient });
```

### `useNonEvmUnstake(sdk, chainNamespace)`

LBTC burn on Solana, Starknet, or Sui. Lifecycle: `prepare → execute`.

```ts
const { unstake, reset, txHash, status, error, isLoading } = useNonEvmUnstake(sdk, 'solana');

await unstake({ amount, sourceChain, destChain, recipient });
```

## License

MIT
