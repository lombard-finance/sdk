# Lombard SDK

The official SDK for integrating with [Lombard Finance](https://lombard.finance) - Bitcoin liquid staking.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [@lombard.finance/sdk](./packages/sdk) | Core SDK for BTC/EVM operations | [![npm](https://img.shields.io/npm/v/@lombard.finance/sdk)](https://www.npmjs.com/package/@lombard.finance/sdk) |
| [@lombard.finance/sdk-common](./packages/sdk-common) | Shared utilities and types | [![npm](https://img.shields.io/npm/v/@lombard.finance/sdk-common)](https://www.npmjs.com/package/@lombard.finance/sdk-common) |
| [@lombard.finance/sdk-solana](./packages/sdk-solana) | Solana integration | [![npm](https://img.shields.io/npm/v/@lombard.finance/sdk-solana)](https://www.npmjs.com/package/@lombard.finance/sdk-solana) |
| [@lombard.finance/sdk-sui](./packages/sdk-sui) | Sui integration | [![npm](https://img.shields.io/npm/v/@lombard.finance/sdk-sui)](https://www.npmjs.com/package/@lombard.finance/sdk-sui) |
| [@lombard.finance/sdk-starknet](./packages/sdk-starknet) | Starknet integration | [![npm](https://img.shields.io/npm/v/@lombard.finance/sdk-starknet)](https://www.npmjs.com/package/@lombard.finance/sdk-starknet) |
| [@lombard.finance/sdk-devtools](./packages/sdk-devtools) | Developer tools | [![npm](https://img.shields.io/npm/v/@lombard.finance/sdk-devtools)](https://www.npmjs.com/package/@lombard.finance/sdk-devtools) |

## Quick Start

```bash
npm install @lombard.finance/sdk
```

```typescript
import { createLombardSDK, Chain, AssetId } from '@lombard.finance/sdk';

// Initialize the SDK
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

// Execute the staking flow
await stake.prepare({ amount: '0.001', recipient: '0x...' });
await stake.authorize();
await stake.generateDepositAddress();

console.log('Deposit BTC to:', stake.depositAddress);
```

## Documentation

- [Full Documentation](https://docs.lombard.finance)
- [SDK Playground](https://lombard.finance/playground)
- [API Reference](https://docs.lombard.finance/sdk)

## Development

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Run tests
yarn test

# Lint
yarn lint
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](./SECURITY.md) for reporting vulnerabilities.

## License

MIT - see [LICENSE](./LICENSE)

## Third-Party License Notes

This repository is MIT-licensed, but includes dependencies with additional terms.

- LayerZero integration packages (`@layerzerolabs/*`) currently use `BUSL-1.1`.
- Some development tooling paths currently pull MetaMask SDK packages with non-commercial terms.

See [Third-Party License Notice](./THIRD_PARTY_LICENSE_NOTICE.md) and [license policy](./.license-policy.json) for the current allowlist and approved exceptions.
