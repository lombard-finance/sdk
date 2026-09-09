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
  actionProviders: [
    lombardActionProvider({
      confirmWrite: (request) => askTheOperator(request),
    }),
  ],
});

// Agent now has access to all Lombard actions
const actions = agentkit.getActions();
```

### Approving Writes

A tool call **is** the transaction: the write actions sign and send as soon as
they are invoked, and what invokes them is a model reading text. Not all of
that text is yours — a token symbol, an address label or an error relayed from
an upstream service reaches the model too, and a tool call cannot be
distinguished from an instruction after the fact.

So each write asks first. Give the provider exactly one of:

- `confirmWrite(request)` — called before anything is signed, including the fee
  authorisation some chains require. Return `false`, or throw, and nothing is
  sent. `request` carries the action, chain, account, amount, assets and the
  recipient, which is the field to read twice: on the BTC output route it is a
  Bitcoin address supplied as a tool argument.
- `autoApproveWrites: true` — no confirmation at all, for a wallet that is
  meant to run unattended and is funded accordingly.

With neither set, write actions report that confirmation is unconfigured and
sign nothing. Read actions are never gated.

The two are mutually exclusive and passing both **throws at construction**.
They contradict each other, and the way to end up with both is adding
`confirmWrite` to a config that already carried `autoApproveWrites: true` —
connecting an approval flow and leaving the old flag behind. Picking a winner
silently would mean handing back unattended execution to someone who thinks
they just built a gate, so it fails while the config is still in front of
whoever wrote it.

Asking the model to confirm in its system prompt is worth doing and is not the
same thing: that is a request to the model, this is a gate it cannot talk its
way past.

### With LangChain

```typescript
import { lombardActionProvider } from "@lombard.finance/sdk-agentkit";
import { AgentKit } from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const agentkit = await AgentKit.from({
  walletProvider,
  actionProviders: [
    lombardActionProvider({ confirmWrite: (request) => askTheOperator(request) }),
  ],
});

const tools = getLangChainTools(agentkit);
const agent = createReactAgent({ llm: yourModel, tools });
```

## Available Actions

### Write Actions

| Action | Description |
| ------ | ----------- |
| `stake_btcb_to_lbtc` | Stake BTC.b to receive LBTC. Handles approval and fee authorization automatically |
| `unstake_lbtc_to_btc` | Unstake LBTC to native BTC (cross-chain) or BTC.b (same-chain) |
| `redeem_lbtc_to_btcb` | Simple same-chain LBTC to BTC.b conversion |
| `deploy_to_earn` | Deploy LBTC into a DeFi vault (Bitcoin Earn) for additional yield |
| `claim_lbtc_deposit` | Claim a notarized BTC deposit to mint LBTC |

### Read Actions

| Action | Description |
| ------ | ----------- |
| `get_lbtc_balance` | Check LBTC balance for any address on the current chain |
| `get_btcb_balance` | Check BTC.b balance for any address on the current chain |
| `get_lbtc_exchange_rate` | Current LBTC/BTC exchange rate and minimum stake amount |
| `get_deposit_status` | Track all deposits (pending, claimable, claimed, failed) |
| `get_redemption_status` | Track all unstake and redemption operations |

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
