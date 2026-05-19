# @lombard.finance/sdk-agentkit

[Coinbase AgentKit](https://github.com/coinbase/agentkit) ActionProvider for the [Lombard protocol](https://lombard.finance). Enables AI agents built with AgentKit to stake Bitcoin, mint LBTC, check balances, and deploy to DeFi vaults.

## Installation

```bash
npm install @lombard.finance/sdk-agentkit
# or
yarn add @lombard.finance/sdk-agentkit
```

### Peer Dependencies

```bash
npm install @coinbase/agentkit viem zod
```

## Quick Start

```typescript
import { lombardActionProvider } from "@lombard.finance/sdk-agentkit";
import { AgentKit } from "@coinbase/agentkit";

const agentkit = await AgentKit.from({
  walletProvider,
  actionProviders: [lombardActionProvider()],
});

// Agent now has access to all Lombard actions
const actions = agentkit.getActions();
```

### With LangChain

```typescript
import { lombardActionProvider } from "@lombard.finance/sdk-agentkit";
import { AgentKit } from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const agentkit = await AgentKit.from({
  walletProvider,
  actionProviders: [lombardActionProvider()],
});

const tools = getLangChainTools(agentkit);
const agent = createReactAgent({ llm: yourModel, tools });
```

## Available Actions

### Write Actions

| Action | Description |
| ------ | ----------- |
| `stake_btcb_to_lbtc` | Stake BTC.b to receive LBTC. Handles approval and fee authorization automatically |
| `unstake_lbtc` | Unstake LBTC to native BTC (cross-chain) or BTC.b (same-chain) |
| `redeem_lbtc_to_btcb` | Simple same-chain LBTC to BTC.b conversion |
| `deploy_to_defi` | Deploy LBTC into a DeFi vault (Bitcoin Earn) for additional yield |
| `claim_deposit` | Claim a notarized BTC deposit to mint LBTC |

### Read Actions

| Action | Description |
| ------ | ----------- |
| `get_lbtc_balance` | Check LBTC balance for any address on the current chain |
| `get_btcb_balance` | Check BTC.b balance for any address on the current chain |
| `get_lbtc_exchange_rate` | Current LBTC/BTC exchange rate and minimum stake amount |
| `get_deposit_status` | Track all deposits (pending, claimable, claimed, failed) |
| `get_unstake_status` | Track all unstake and redemption operations |

## Supported Networks

| AgentKit Network ID | Chain | Environment |
| ------------------- | ----- | ----------- |
| `ethereum-mainnet` | Ethereum | Production |
| `ethereum-sepolia` | Ethereum Sepolia | Testnet |
| `base-mainnet` | Base | Production |
| `base-sepolia` | Base Sepolia | Testnet |

Network aliases are also accepted: `ethereum`, `eth`, `mainnet`, `sepolia`, `base`, `base-sep`.

## How It Works

The `LombardActionProvider` bridges Coinbase AgentKit and the Lombard SDK:

1. **Network mapping**: Translates AgentKit network IDs to Lombard chain configuration
2. **Wallet adaptation**: Converts AgentKit's wallet provider to EIP-1193 for the Lombard SDK
3. **Automatic approvals**: Checks and sets token allowances before transactions
4. **Fee authorization**: Handles EIP-712 fee signatures on chains that require them (Ethereum, Sepolia)
5. **Error sanitization**: Strips RPC URLs and sensitive data from error messages

All write actions execute real on-chain transactions through the AgentKit wallet.

## Utilities

```typescript
import {
  resolveNetwork,
  resolveChainName,
  isLombardSupportedNetwork,
} from "@lombard.finance/sdk-agentkit";

// Check if a network is supported
isLombardSupportedNetwork(network); // boolean

// Resolve AgentKit network to Lombard config
const resolved = resolveNetwork(network);
// { chainId, env, networkId }

// Resolve by friendly name
const resolved = resolveChainName("ethereum");
// { chainId: 1, env: "prod", networkId: "ethereum-mainnet" }
```

## Requirements

- **Node.js**: 18+
- **@coinbase/agentkit**: 0.2+
- **viem**: 2.21+

## License

MIT
