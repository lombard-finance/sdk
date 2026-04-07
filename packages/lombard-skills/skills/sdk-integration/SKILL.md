---
name: sdk-integration
description: Integrate Lombard SDK into applications for Bitcoin staking, LBTC operations, and AI agent tooling
read_when:
  - user wants to integrate Lombard SDK
  - user is building with @lombard.finance/sdk
  - user wants to create an AI agent with Lombard tools
  - user asks about MCP server setup for Lombard
  - user wants to use AgentKit with Lombard
  - user asks about createLombardSDK setup
  - user asks about action lifecycle pattern
requires: []
metadata:
  emoji: "🔧"
  sdkVersion: ">=4.4.0"
---

# Lombard SDK Integration

This skill covers SDK initialization, architecture, the action lifecycle pattern, all 7 packages, agent tooling setup, and error handling.

## Package Overview

| Package | Purpose | Install |
|---------|---------|---------|
| `@lombard.finance/sdk` | Core SDK for all Lombard operations | `npm install @lombard.finance/sdk viem` |
| `@lombard.finance/sdk-common` | Shared types and utilities | Peer of sdk (not installed directly) |
| `@lombard.finance/sdk-react` | React hooks for Lombard | `npm install @lombard.finance/sdk-react` |
| `@lombard.finance/sdk-agent` | Framework-agnostic AI agent tools | `npm install @lombard.finance/sdk-agent` |
| `@lombard.finance/sdk-agentkit` | Coinbase AgentKit ActionProvider | `npm install @lombard.finance/sdk-agentkit` |
| `@lombard.finance/mcp-server` | MCP server for Lombard tools | `npx @lombard.finance/mcp-server` |
| `@lombard.finance/lombard-skills` | Skill files for AI coding assistants | Bundled, not installed |

## SDK Initialization: createLombardSDK()

`createLombardSDK()` is THE primary entry point. It is an async factory that validates config, loads the asset catalog, and returns a fully initialized `LombardSDK` instance.

```typescript
import { createLombardSDK, Env } from '@lombard.finance/sdk';

// Option 1: Direct creation (simplest)
const sdk = await createLombardSDK({
  env: Env.prod,
  providers: {
    evm: () => window.ethereum,        // EIP-1193 provider
    bitcoin: () => bitcoinProvider,     // BTC wallet provider (optional)
  },
});

// Option 2: Separate config (for shared config across modules)
import { createConfig } from '@lombard.finance/sdk';

const config = createConfig({
  env: Env.prod,
  providers: {
    evm: () => window.ethereum,
  },
});
const sdk = await createLombardSDK(config);
```

### Environment Configuration

```typescript
import { Env } from '@lombard.finance/sdk';

// Production: Ethereum mainnet, Base
const env = Env.prod;

// Testnet: Sepolia, Base Sepolia
const env = Env.testnet;
```

## SDK Architecture: Namespaces

The SDK organizes all operations under typed namespaces:

### sdk.chain.btc.* (BTC Actions)

Bitcoin operations that generate deposit addresses and monitor cross-chain flows:

| Method | Returns | Description |
|--------|---------|-------------|
| `stake(params)` | `BtcStake` | BTC -> LBTC |
| `stakeAndDeploy(params)` | `BtcStakeAndDeploy` | BTC -> LBTC -> Vault (StakeAndBake) |
| `deposit(params)` | `BtcDeposit` | BTC -> BTC.b |
| `depositAndDeploy(params)` | `BtcDepositAndDeploy` | BTC -> BTC.b -> Vault |

### sdk.chain.evm.* (EVM Actions)

On-chain EVM operations:

| Method | Returns | Description |
|--------|---------|-------------|
| `stake(params)` | `IEvmStake` | BTC.b -> LBTC |
| `unstake(params)` | `IEvmUnstake` | LBTC -> BTC (cross-chain) or LBTC -> BTC.b |
| `deposit(params)` | `IEvmDeposit` | BTC.b -> LBTC (claim notarized deposit) |
| `deploy(params)` | `IEvmDeploy` | LBTC -> Vault |
| `redeem(params)` | `IEvmRedeem` | BTC.b -> BTC (cross-chain) |
| `withdraw(params)` | `IEvmWithdraw` | Vault withdrawal queue |
| `cancelWithdraw(params)` | `IEvmCancelWithdraw` | Cancel pending withdrawal |

### sdk.chain.solana/sui/starknet.* (Non-EVM Actions)

Non-EVM chain support for unstaking LBTC.

### sdk.api.* (API Namespace)

Data-fetching operations with environment pre-configured:

| Method | Description |
|--------|-------------|
| `deposits(address)` | Fetch all deposits for an address |
| `unstakes(address, options?)` | Fetch unstake/redemption history |
| `points(address, season?)` | Fetch Lux points |
| `exchangeRatio()` | Get exchange ratios for all supported tokens |
| `depositAddress(address, chainId, options?)` | Get existing BTC deposit address |
| `vaultWithdrawals(address, options?)` | Fetch categorized vault withdrawals |

### sdk.assets.*

Asset metadata and chain discovery.

## Action Lifecycle Pattern

All workflow classes follow a consistent lifecycle pattern:

```
IDLE -> [authorization step] -> READY -> COMPLETED/ADDRESS_READY
```

### BTC Actions Lifecycle

```typescript
import { AssetId, Chain, BtcActionStatus } from '@lombard.finance/sdk';

const stake = sdk.chain.btc.stake({
  assetOut: AssetId.LBTC,
  destChain: Chain.ETHEREUM,
});

// Step 1: prepare() - validates params, checks existing state
await stake.prepare({ amount: '0.1', recipient: '0x...' });

// Step 2: authorize() - wallet signature (fee or address confirmation)
if (
  stake.status === BtcActionStatus.NEEDS_FEE_AUTHORIZATION ||
  stake.status === BtcActionStatus.NEEDS_ADDRESS_CONFIRMATION
) {
  await stake.authorize();
}

// Step 3: generateDepositAddress() - sends signature to API
const btcAddress = await stake.generateDepositAddress();

// Step 4: User sends BTC to btcAddress

// Step 5: monitorDeposit() - poll for confirmations and minting
stake.on('progress', (p) => {
  console.log(`${p.confirmations}/${p.requiredConfirmations} confirmations`);
  if (p.isClaimed) console.log('Done!');
});
```

**BTC action statuses:**
- `idle` - ready for `prepare()`
- `needs_fee_authorization` - EIP-712 fee signing needed (Ethereum destinations)
- `needs_address_confirmation` - EIP-191 address signing needed (non-Ethereum destinations)
- `needs_deploy_authorization` - EIP-2612 Permit needed (StakeAndBake)
- `ready` - authorization done, can generate deposit address
- `address_ready` - deposit address generated, awaiting BTC

### EVM Actions Lifecycle

```typescript
import { AssetId, Chain, EvmOperationStatus } from '@lombard.finance/sdk';

const unstake = sdk.chain.evm.unstake({
  assetIn: AssetId.LBTC,
  assetOut: AssetId.BTC,
  sourceChain: Chain.ETHEREUM,
  destChain: Chain.BITCOIN_MAINNET,
});

// Step 1: prepare()
await unstake.prepare({ amount: '0.01', recipient: 'bc1q...' });

// Step 2: authorizeFee() (if needed on Ethereum/Sepolia)
if (unstake.status === EvmOperationStatus.NEEDS_FEE_AUTHORIZATION) {
  await unstake.authorizeFee();
}

// Step 3: execute()
const { txHash } = await unstake.execute();
```

**EVM operation statuses:**
- `idle` - ready for `prepare()`
- `needs_fee_authorization` - EIP-712 fee signing needed
- `needs-approval` - ERC-20 token approval needed
- `ready` - can execute
- `confirming` - transaction submitted, waiting for confirmation
- `completed` - done

### Error Stays at Step

There is NO `failed` status. When an error occurs:
- `status` stays at the step where it happened (tells you WHERE)
- `error` property holds the error object (tells you WHAT)
- Retry by calling the same method again

```typescript
try {
  await stake.authorize();
} catch (err) {
  // stake.status is still 'needs_fee_authorization'
  // User rejected? Try again:
  await stake.authorize();
}
```

## Event System

All actions emit events for reactive UIs:

```typescript
// Status changes
const unsub = action.on('status-change', (newStatus) => {
  console.log('New status:', newStatus);
});

// Progress (BTC actions, for confirmation tracking)
action.on('progress', (progress) => {
  console.log(progress.confirmations, progress.requiredConfirmations);
});

// Clean up
unsub();
```

## Supported Chains

Query at runtime:

```typescript
import { SUPPORTED_CHAINS } from '@lombard.finance/sdk-agent';
import { requiresAutoMintFee } from '@lombard.finance/sdk';

for (const [chainId, config] of Object.entries(SUPPORTED_CHAINS)) {
  console.log(`${config.name} (${chainId}): env=${config.env}`);
  console.log(`  Fee auth required: ${requiresAutoMintFee(config.chainId)}`);
}
```

## Core Enums

```typescript
import { AssetId, Chain, DeployProtocol } from '@lombard.finance/sdk';

// Assets
AssetId.LBTC    // Lombard Staked Bitcoin
AssetId.BTCb    // Wrapped Bitcoin
AssetId.BTC     // Native Bitcoin

// Chains (CAIP-2 identifiers)
Chain.ETHEREUM         // eip155:1
Chain.BASE             // eip155:8453
Chain.AVALANCHE        // eip155:43114
Chain.BITCOIN_MAINNET  // bip122:000000000019d6689c085ae165831e93
Chain.BITCOIN_SIGNET   // bip122:signet

// Deploy protocols
DeployProtocol.Veda   // 'veda'
DeployProtocol.Silo   // 'silo'
```

## AI Agent Tools (`@lombard.finance/sdk-agent`)

11 framework-agnostic tool definitions:

| Tool Name | Type | Description |
|-----------|------|-------------|
| `get_lbtc_balance` | Read | Check LBTC balance |
| `get_btcb_balance` | Read | Check BTC.b balance |
| `get_balance` | Read | Check both balances |
| `get_exchange_rate` | Read | LBTC/BTC rate + min stake |
| `get_deposit_status` | Read | Track deposit statuses |
| `get_unstake_status` | Read | Track unstake statuses |
| `get_strategies` | Read | List vaults with APY/TVL |
| `get_deposit_btc_address` | Read | Get BTC deposit address |
| `prepare_stake` | Write | Prepare BTC.b -> LBTC tx |
| `prepare_unstake` | Write | Prepare LBTC unstake tx |
| `prepare_deploy_to_vault` | Write | Prepare vault deploy tx |

### Direct Usage

```typescript
import {
  getLbtcBalance,
  getExchangeRate,
  prepareStake,
  allTools,
  toolsByName,
} from '@lombard.finance/sdk-agent';

// Execute a single tool
const balance = await getLbtcBalance.execute({ address: '0x...', chainId: 8453 });

// Access all tools as an array
console.log(allTools.map(t => t.name));

// Access by name
const tool = toolsByName['get_lbtc_balance'];
```

### Vercel AI SDK

```typescript
import { lombardTools } from '@lombard.finance/sdk-agent/vercel';
import { streamText } from 'ai';

const result = await streamText({
  model: yourModel,
  tools: lombardTools, // Record<string, VercelAITool> with all 11 tools
  messages,
});
```

### LangChain

```typescript
import { lombardLangchainTools } from '@lombard.finance/sdk-agent/langchain';

const agent = createToolCallingAgent({
  llm: model,
  tools: lombardLangchainTools,
  prompt: chatPrompt,
});
```

## MCP Server Setup

Exposes Lombard read operations as MCP tools for Claude Desktop, Claude Code, Cursor, and any MCP client.

### Configuration

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

`LOMBARD_ENV`: `"mainnet"` (default) or `"testnet"`.

### Available MCP Tools

Read-only tools: `get_lbtc_balance`, `get_btcb_balance`, `get_balance`, `get_exchange_rate`, `get_deposit_status`, `get_unstake_status`, `get_strategies`, `get_deposit_btc_address`.

Write operations are not available via MCP because MCP clients lack standardized transaction signing.

## Coinbase AgentKit

For autonomous agents that execute real transactions:

```typescript
import { lombardActionProvider } from '@lombard.finance/sdk-agentkit';

const agent = createAgent({
  walletProvider: yourWalletProvider,
  actionProviders: [lombardActionProvider()],
});
```

Includes both read and write operations. Write operations execute real transactions through the AgentKit wallet provider.

## React Hooks (`@lombard.finance/sdk-react`)

| Hook | Returns | Description |
|------|---------|-------------|
| `useLombardSDK(configFn, deps)` | `{ sdk, isInitializing, error }` | Initialize SDK instance |
| `useBtcStake(sdk)` | `{ stake, depositAddress, status, progress, ... }` | BTC staking flow |
| `useBtcStakeAndBake(sdk)` | `{ stakeAndDeploy, depositAddress, status, progress, ... }` | StakeAndBake flow |
| `useEvmUnstake(sdk)` | `{ unstake, txHash, status, error, ... }` | EVM unstaking flow |

### useLombardSDK Example

```typescript
import { useLombardSDK } from '@lombard.finance/sdk-react';
import { createConfig, Env } from '@lombard.finance/sdk';

const { sdk, isInitializing, error } = useLombardSDK(
  () => !window.ethereum ? undefined : createConfig({
    env: Env.prod,
    providers: { evm: () => window.ethereum! },
  }),
  [env], // re-initialize when env changes
);

if (isInitializing) return <div>Loading SDK...</div>;
if (error) return <div>SDK Error: {error}</div>;
// sdk is ready to use
```

## Framework Comparison

| Capability | SDK Direct | sdk-agent | MCP Server | AgentKit |
|------------|-----------|-----------|------------|----------|
| Read balances | Yes | Yes | Yes | Yes |
| Exchange rates | Yes | Yes | Yes | Yes |
| Deposit tracking | Yes | Yes | Yes | Yes |
| Stake BTC.b | Yes | Returns tx params | No | Executes tx |
| Unstake LBTC | Yes | Returns tx params | No | Executes tx |
| Deploy to vault | Yes | Returns tx params | No | Executes tx |
| Wallet required | Yes | No (params only) | No | Yes |
| Framework | TypeScript | Vercel AI / LangChain | Any MCP client | AgentKit |

Choose based on your use case:
- **Building a dApp**: `@lombard.finance/sdk` directly (or `sdk-react` for React)
- **AI assistant (read-only)**: `@lombard.finance/mcp-server`
- **AI agent with tool calling**: `@lombard.finance/sdk-agent` with Vercel AI or LangChain
- **Autonomous agent**: `@lombard.finance/sdk-agentkit` with Coinbase AgentKit

## Error Handling

All SDK functions throw `LombardError` with descriptive messages:

```typescript
import { isLombardError, LombardError } from '@lombard.finance/sdk';

try {
  const balance = await getLbtcBalance.execute({
    address: '0x...',
    chainId: 999,
  });
} catch (error) {
  if (isLombardError(error)) {
    console.log(error.code);    // e.g., 'INVALID_CHAIN'
    console.log(error.message); // 'Unsupported chain ID: 999. Supported: 1, 11155111, 8453, 84532'
  }
}
```

For action classes, errors stay at the failing step for retry:

```typescript
// Error during authorize()
// action.status remains 'needs_fee_authorization'
// action.error has the LombardError
// Retry: await action.authorize()
```

## Links

- SDK npm: https://www.npmjs.com/package/@lombard.finance/sdk
- Agent tools npm: https://www.npmjs.com/package/@lombard.finance/sdk-agent
- AgentKit npm: https://www.npmjs.com/package/@lombard.finance/sdk-agentkit
- MCP server npm: https://www.npmjs.com/package/@lombard.finance/mcp-server
- Documentation: https://docs.lombard.finance
