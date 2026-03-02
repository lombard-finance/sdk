# @lombard.finance/sdk-agentkit

Lombard Action Provider for [Coinbase AgentKit](https://github.com/coinbase/agentkit) — enables AI agents to interact with the Lombard protocol for BTC.b / LBTC operations.

## Actions

| Action | Description | Input |
|--------|-------------|-------|
| `stake_btcb_to_lbtc` | Stake BTC.b → LBTC | `amount` |
| `unstake_lbtc` | Unstake LBTC → BTC.b | `amount`, `recipient` |
| `deposit_to_lbtc` | Deposit BTC.b → LBTC | `amount`, `recipient` |
| `redeem_btcb_to_btc` | Redeem BTC.b → BTC (cross-chain) | `amount`, `recipient` |
| `deploy_lbtc_to_defi` | Deploy LBTC → Veda/Silo | `amount`, `protocol` |

## Installation

```bash
npm install @lombard.finance/sdk-agentkit @coinbase/agentkit viem zod
```

## Quick Start

```typescript
import { AgentKit } from '@coinbase/agentkit';
import { lombardActionProvider } from '@lombard.finance/sdk-agentkit';

const agentkit = await AgentKit.from({
  walletProvider,
  actionProviders: [lombardActionProvider()],
});

// Use with LangChain
import { getLangChainTools } from '@coinbase/agentkit-langchain';

const tools = getLangChainTools(agentkit);
```

## Supported Networks

Only chains with BTC.b deployed:

- Ethereum (1)
- Avalanche (43114)
- Katana (747474)
- MegaETH (4326)
- Stable (988)
- Sepolia (11155111) — testnet
- Avalanche Fuji (43113) — testnet

## Configuration

```typescript
import { Env } from '@lombard.finance/sdk';

// Production (default)
lombardActionProvider();

// Testnet
lombardActionProvider(Env.testnet);
```

## How It Works

Each action wraps a multi-step Lombard SDK flow into a single AgentKit tool call:

```
LLM tool call → prepare() → [approve()] → [authorizeFee()] → execute() → result string
```

The provider automatically handles:
- ERC-20 approvals when required (Avalanche stake, DeFi deploy)
- EIP-712 fee authorization on unsubsidized chains (Ethereum, Sepolia)
- Chain detection and validation via `supportsNetwork()`

## Advanced: Using Utilities Directly

```typescript
import { toEIP1193Provider, toLombardChain } from '@lombard.finance/sdk-agentkit';

// Bridge AgentKit wallet to EIP-1193
const eip1193 = toEIP1193Provider(walletProvider);

// Convert AgentKit network to Lombard chain ID
const chain = toLombardChain(walletProvider.getNetwork());
```

## License

MIT
