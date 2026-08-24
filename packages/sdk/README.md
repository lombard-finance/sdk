# @lombard.finance/sdk

The official Lombard SDK for Bitcoin staking and LBTC operations across Bitcoin, EVM, Solana, Sui, and Starknet.

## Installation

```bash
npm install @lombard.finance/sdk
```

### Peer Dependencies

The SDK requires these peer dependencies:

```bash
npm install axios@^1 bignumber.js@^9 @bitcoinerlab/secp256k1@1.2.0 bitcoinjs-lib@6.1.5 @layerzerolabs/lz-v2-utilities@3.0.17
```

> **Note:** `viem` is included as a direct dependency and does not need to be installed separately.

## Quick Start

```typescript
import { createLombardSDK, Chain, AssetId } from '@lombard.finance/sdk';

// Initialize SDK
const sdk = await createLombardSDK({
  env: 'prod',
  providers: {
    evm: () => window.ethereum,
    bitcoin: () => window.btc,
  },
});

// Create a BTC deposit. `assetOut` picks what gets minted: LBTC or BTC.b.
const deposit = sdk.chain.btc.deposit({
  assetOut: AssetId.LBTC,
  destChain: Chain.ETHEREUM,
});

// Listen to events
deposit.on('status-change', (status) => console.log('Status:', status));
deposit.on('progress', (progress) => console.log('Progress:', progress));

// Execute the action lifecycle
await deposit.prepare({ amount: '0.001', recipient: '0x...' });
await deposit.authorize(); // If required
await deposit.generateDepositAddress();

// The user sends BTC to deposit.depositAddress, and it mints on confirmation.
```

## Configuration

The SDK provides two approaches:

### Full SDK (Recommended)

```typescript
// SDK initialization is async (fetches config)
const sdk = await createLombardSDK({
  env: 'prod',
  providers: { evm: () => window.ethereum },
});
```

## Architecture

The SDK uses an **action-based architecture** where each operation is an action object with a consistent lifecycle:

```
create → prepare → execute → complete
```

### Available Actions

Three verbs carry every route. Where one covers more than a single route, it
dispatches on the asset in the parameters rather than on the method name.

| Chain    | Action                          | Description                                 |
| -------- | ------------------------------- | ------------------------------------------- |
| BTC      | `sdk.chain.btc.deposit()`       | BTC → LBTC or BTC.b (dispatches `assetOut`)  |
| BTC      | `sdk.chain.btc.deploy()`        | BTC → a DeFi vault position                  |
| EVM      | `sdk.chain.evm.deposit()`       | BTC.b → LBTC                                 |
| EVM      | `sdk.chain.evm.withdraw()`      | LBTC or BTC.b → BTC, and vault exits         |
| EVM      | `sdk.chain.evm.deploy()`        | LBTC or BTC.b → a DeFi vault position        |
| EVM      | `sdk.chain.evm.claim()`         | Claim a pending BTC.b deposit as LBTC        |
| EVM      | `sdk.chain.evm.cancelWithdraw()`| Cancel a queued vault withdrawal             |
| Solana   | `sdk.chain.solana.deposit()`    | BTC.b → LBTC                                 |
| Solana   | `sdk.chain.solana.withdraw()`   | LBTC or BTC.b → BTC or BTC.b                 |
| Sui      | `sdk.chain.sui.withdraw()`      | LBTC → BTC                                   |
| Starknet | `sdk.chain.starknet.withdraw()` | LBTC → BTC                                   |

Upgrading from 5.x? See [MIGRATION_6.md](./MIGRATION_6.md) — the old verbs are
removed, not deprecated.

### Data API

Query deposits, withdrawals, points, and exchange rates:

```typescript
const deposits = await sdk.api.deposits(address);
const withdrawals = await sdk.api.withdrawals(address);
const points = await sdk.api.points(address);
const rate = await sdk.api.exchangeRatio();
```

## Playground

Try the SDK interactively at **[lombard.finance/playground](https://lombard.finance/playground)**.

The playground provides:

- Live code examples for all actions
- Real wallet connections
- Testnet and mainnet environments
- Step-by-step action execution

## Documentation

- [Getting Started](./docs/user-guides/QS-01-GETTING-STARTED.md)
- [Action Lifecycle](./docs/user-guides/DG-01-ACTION-LIFECYCLE.md)
- [Migration from v3.x](./docs/user-guides/MIGRATION-V4.md)
- [Full Documentation Index](./docs/user-guides/INDEX.md)

## Non-EVM Chains

For Solana, Sui, and Starknet, install the chain-specific modules:

```bash
# Solana
npm install @lombard.finance/sdk-solana

# Sui
npm install @lombard.finance/sdk-sui

# Starknet
npm install @lombard.finance/sdk-starknet
```

Register modules when creating the SDK:

```typescript
import { solanaModule } from '@lombard.finance/sdk-solana';
import { suiModule } from '@lombard.finance/sdk-sui';

const sdk = await createLombardSDK({
  env: 'prod',
  modules: [solanaModule(), suiModule()],
  providers: {
    solana: () => window.solana,
    sui: () => suiWallet,
  },
});
```

## Requirements

- **TypeScript**: 5.0+
- **Node.js**: 18+ (ESM support required)
- **Browser**: Modern browsers with ES2020 support

## Environment

| Environment | Description         | Use For             |
| ----------- | ------------------- | ------------------- |
| `prod`      | Production mainnet  | Live deployments    |
| `testnet`   | Public testnet      | Integration testing |
| `stage`     | Staging environment | Internal testing    |

## License

MIT © [Lombard Finance](https://lombard.finance)
