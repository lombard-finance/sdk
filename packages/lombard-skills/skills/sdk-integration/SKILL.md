---
name: sdk-integration
description: Integrate Lombard SDK into applications for Bitcoin staking, LBTC operations, and AI agent tooling
read_when:
  - user wants to integrate Lombard SDK
  - user is building with @lombard.finance/sdk
  - user wants to create an AI agent with Lombard tools
  - user asks about MCP server setup for Lombard
  - user wants to use AgentKit with Lombard
requires: []
metadata:
  emoji: "🔧"
  sdkVersion: ">=4.4.0"
---

# Lombard SDK Integration

This skill covers installing and configuring the Lombard SDK, setting up agent tools, configuring the MCP server, and integrating with Coinbase AgentKit.

## Package Overview

| Package | Purpose | Install |
|---------|---------|---------|
| `@lombard.finance/sdk` | Core SDK for all Lombard operations | `npm install @lombard.finance/sdk` |
| `@lombard.finance/sdk-react` | React hooks for Lombard | `npm install @lombard.finance/sdk-react` |
| `@lombard.finance/sdk-agent` | Framework-agnostic AI agent tools | `npm install @lombard.finance/sdk-agent` |
| `@lombard.finance/sdk-agentkit` | Coinbase AgentKit ActionProvider | `npm install @lombard.finance/sdk-agentkit` |
| `@lombard.finance/mcp-server` | MCP server for Lombard tools | `npx @lombard.finance/mcp-server` |

## Core SDK Setup

### Installation

```bash
npm install @lombard.finance/sdk viem
```

`viem` is a required peer dependency.

### Environment Configuration

The SDK uses two environments:

```typescript
import { Env, ChainId } from "@lombard.finance/sdk";

// Production (mainnet chains)
const env = Env.prod;
// Testnet (Sepolia, Base Sepolia)
const env = Env.testnet;
```

### Chain ID Mapping

| Chain | Chain ID | ChainId Enum | Environment |
|-------|----------|--------------|-------------|
| Ethereum | 1 | `ChainId.ethereum` | `Env.prod` |
| Base | 8453 | `ChainId.base` | `Env.prod` |
| Sepolia | 11155111 | `ChainId.sepolia` | `Env.testnet` |
| Base Sepolia | 84532 | `ChainId.baseSepoliaTestnet` | `Env.testnet` |

### Common Patterns

```typescript
import {
  getTokenContractInfo,
  Token,
  ChainId,
  Env,
} from "@lombard.finance/sdk";
import { createPublicClient, createWalletClient, http } from "viem";
import { base } from "viem/chains";

// Get token contract addresses
const lbtcInfo = await getTokenContractInfo(Token.LBTC, ChainId.base, Env.prod);
const btcbInfo = await getTokenContractInfo(Token.BTCb, ChainId.base, Env.prod);

// Create viem clients
const publicClient = createPublicClient({ chain: base, transport: http() });
const walletClient = createWalletClient({
  chain: base,
  transport: http(),
  account: userAddress,
});
```

## AI Agent Tools (`@lombard.finance/sdk-agent`)

The agent package provides 11 framework-agnostic tool definitions that can be adapted to any AI framework.

### Installation

```bash
npm install @lombard.finance/sdk-agent @lombard.finance/sdk viem
```

### Available Tools

| Tool Name | Type | Description |
|-----------|------|-------------|
| `get_lbtc_balance` | Read | Check LBTC balance for a wallet |
| `get_btcb_balance` | Read | Check BTC.b balance for a wallet |
| `get_balance` | Read | Check both LBTC and BTC.b balances |
| `get_exchange_rate` | Read | Get LBTC/BTC rate and min stake |
| `get_deposit_status` | Read | Track deposit statuses |
| `get_unstake_status` | Read | Track unstake statuses |
| `get_strategies` | Read | List yield vaults with APY/TVL |
| `get_deposit_btc_address` | Read | Get BTC deposit address |
| `prepare_stake` | Write | Prepare BTC.b to LBTC stake tx |
| `prepare_unstake` | Write | Prepare LBTC unstake tx |
| `prepare_deploy_to_vault` | Write | Prepare vault deployment tx |

### Direct Tool Usage

```typescript
import {
  getLbtcBalance,
  getExchangeRate,
  prepareStake,
  allTools,
  toolsByName,
} from "@lombard.finance/sdk-agent";

// Execute a single tool
const balance = await getLbtcBalance.execute({
  address: "0x...",
  chainId: 8453,
});

// Access all tools as an array
console.log(allTools.map(t => t.name));

// Access tools by name
const tool = toolsByName["get_lbtc_balance"];
const result = await tool.execute({ address: "0x...", chainId: 8453 });
```

### Vercel AI SDK Integration

```typescript
import { lombardTools } from "@lombard.finance/sdk-agent/vercel";
import { streamText } from "ai";

const result = await streamText({
  model: yourModel,
  tools: lombardTools,
  messages,
});
```

The `lombardTools` object is a Record where each key is the tool name and each value is a Vercel AI SDK tool created with the `tool()` helper. All 11 tools are included.

### LangChain Integration

```typescript
import { lombardLangchainTools } from "@lombard.finance/sdk-agent/langchain";

// Use with a LangChain agent
const agent = createToolCallingAgent({
  llm: model,
  tools: lombardLangchainTools,
  prompt: chatPrompt,
});
```

## MCP Server Setup

The MCP server exposes Lombard read operations as MCP tools, usable from Claude Desktop, Claude Code, Cursor, and any MCP-compatible client.

### Claude Desktop / Claude Code Configuration

Add to your MCP settings (e.g., `claude_desktop_config.json` or `.mcp.json`):

```json
{
  "mcpServers": {
    "lombard": {
      "command": "npx",
      "args": ["-y", "@lombard.finance/mcp-server"],
      "env": {
        "LOMBARD_ENV": "mainnet"
      }
    }
  }
}
```

### Environment Variable

Set `LOMBARD_ENV` to control the environment:
- `"mainnet"` (default): Uses production endpoints (Ethereum, Base)
- `"testnet"`: Uses testnet endpoints (Sepolia, Base Sepolia)

### Available MCP Tools

The MCP server exposes read-only tools:
- `get_lbtc_balance`
- `get_btcb_balance`
- `get_balance`
- `get_exchange_rate`
- `get_deposit_status`
- `get_unstake_status`
- `get_strategies`
- `get_deposit_btc_address`

Write operations (stake, unstake, deploy) are not available via MCP because MCP clients do not have a standardized way to sign transactions.

## Coinbase AgentKit Integration

For agents built with Coinbase AgentKit that need to execute real transactions:

### Installation

```bash
npm install @lombard.finance/sdk-agentkit @lombard.finance/sdk viem
```

### Usage

```typescript
import { lombardActionProvider } from "@lombard.finance/sdk-agentkit";

// Add to your AgentKit configuration
const agent = createAgent({
  walletProvider: yourWalletProvider,
  actionProviders: [lombardActionProvider()],
});
```

The AgentKit provider includes both read and write operations. Write operations execute real transactions through the AgentKit wallet provider.

## Framework Comparison

| Capability | SDK Direct | sdk-agent (Vercel/LangChain) | MCP Server | AgentKit |
|------------|-----------|------------------------------|------------|----------|
| Read balances | Yes | Yes | Yes | Yes |
| Exchange rates | Yes | Yes | Yes | Yes |
| Deposit tracking | Yes | Yes | Yes | Yes |
| Stake BTC.b | Yes | Returns tx params | No | Executes tx |
| Unstake LBTC | Yes | Returns tx params | No | Executes tx |
| Deploy to vault | Yes | Returns tx params | No | Executes tx |
| Wallet required | Yes | No (params only) | No | Yes |
| Framework | TypeScript | Vercel AI / LangChain | Any MCP client | AgentKit |

Choose based on your use case:
- **Building a dApp**: Use `@lombard.finance/sdk` directly (or `sdk-react` for React apps)
- **Building an AI assistant (read-only)**: Use `@lombard.finance/mcp-server`
- **Building an AI agent with tool calling**: Use `@lombard.finance/sdk-agent` with your preferred framework
- **Building an autonomous agent that executes transactions**: Use `@lombard.finance/sdk-agentkit` with Coinbase AgentKit

## Error Handling

All SDK functions throw errors with descriptive messages. Common patterns:

```typescript
try {
  const balance = await getLbtcBalance.execute({
    address: "0x...",
    chainId: 999, // unsupported chain
  });
} catch (error) {
  // "Unsupported chain ID: 999. Supported: 1, 11155111, 8453, 84532"
}
```

## Links

- SDK npm: https://www.npmjs.com/package/@lombard.finance/sdk
- Agent tools npm: https://www.npmjs.com/package/@lombard.finance/sdk-agent
- AgentKit npm: https://www.npmjs.com/package/@lombard.finance/sdk-agentkit
- MCP server npm: https://www.npmjs.com/package/@lombard.finance/mcp-server
- Documentation: https://docs.lombard.finance
