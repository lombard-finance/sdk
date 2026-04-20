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

// Create a BTC Stake action
const stake = sdk.chain.btc.stake({
  assetOut: AssetId.LBTC,
  destChain: Chain.ETHEREUM,
});

// Listen to events
stake.on('status-change', (status) => console.log('Status:', status));
stake.on('progress', (progress) => console.log('Progress:', progress));

// Execute the action lifecycle
await stake.prepare({ amount: '0.001', recipient: '0x...' });
await stake.authorize(); // If required
await stake.generateDepositAddress();

// User sends BTC to stake.depositAddress
// Funds auto-mint to LBTC
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

The SDK uses an **action-based architecture** where each operation (stake, unstake, deploy, etc.) is represented as an action object with a consistent lifecycle:

```
create → prepare → execute → complete
```

### Available Actions

| Chain | Action | Description |
|-------|--------|-------------|
| BTC | `sdk.chain.btc.stake()` | Stake BTC → LBTC |
| BTC | `sdk.chain.btc.deposit()` | Deposit BTC → BTC.b |
| EVM | `sdk.chain.evm.unstake()` | Burn LBTC → BTC |
| EVM | `sdk.chain.evm.stake()` | Stake BTC.b → LBTC |
| EVM | `sdk.chain.evm.redeem()` | Redeem from DeFi vaults |
| EVM | `sdk.chain.evm.deploy()` | Deploy to DeFi vaults |
| Solana | `sdk.chain.solana.unstake()` | Burn LBTC on Solana |
| Sui | `sdk.chain.sui.unstake()` | Burn LBTC on Sui |
| Starknet | `sdk.chain.starknet.unstake()` | Burn LBTC on Starknet |

### Data API

Query deposits, unstakes, points, and exchange rates:

```typescript
const deposits = await sdk.api.deposits(address);
const unstakes = await sdk.api.unstakes(address);
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

| Environment | Description | Use For |
|-------------|-------------|---------|
| `prod` | Production mainnet | Live deployments |
| `testnet` | Public testnet | Integration testing |
| `stage` | Staging environment | Internal testing |

## License

MIT © [Lombard Finance](https://lombard.finance)
