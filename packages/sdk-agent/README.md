# @lombard.finance/sdk-agent

AI agent tools for the [Lombard protocol](https://lombard.finance). Give any LLM the ability to stake Bitcoin, check balances, deploy to DeFi vaults, and interact with Morpho Blue lending markets.

Framework-agnostic core with ready-made adapters for [Vercel AI SDK](https://sdk.vercel.ai/) and [LangChain](https://js.langchain.com/).

## Installation

```bash
npm install @lombard.finance/sdk-agent
# or
yarn add @lombard.finance/sdk-agent
```

### Peer Dependencies

`viem` is required. Framework adapters are optional, install whichever you use:

```bash
# Required
npm install viem

# For Vercel AI SDK
npm install ai

# For LangChain
npm install @langchain/core
```

## Quick Start

### Vercel AI SDK

```typescript
import { lombardTools } from "@lombard.finance/sdk-agent/vercel";
import { LOMBARD_SYSTEM_PROMPT } from "@lombard.finance/sdk-agent";
import { streamText } from "ai";

const result = streamText({
  model: yourModel,
  system: LOMBARD_SYSTEM_PROMPT,
  tools: lombardTools,
  messages,
});
```

### LangChain

```typescript
import { lombardLangChainTools } from "@lombard.finance/sdk-agent/langchain";
import { LOMBARD_SYSTEM_PROMPT } from "@lombard.finance/sdk-agent";

const agent = createReactAgent({
  llm: yourModel,
  tools: lombardLangChainTools,
  messageModifier: LOMBARD_SYSTEM_PROMPT,
});
```

### Framework-Agnostic

```typescript
import { allTools, toolsByName } from "@lombard.finance/sdk-agent";

// allTools: array of all tool definitions
// toolsByName: record keyed by tool name

// Each tool has:
// - name, description (for LLM context)
// - schema (Zod) and parameters (JSON Schema)
// - execute(params) -> Promise<result>
```

## Available Tools

### Balances and Rates

| Tool | Description |
| ---- | ----------- |
| `get_lbtc_balance` | Check LBTC balance for a wallet on any supported chain |
| `get_btcb_balance` | Check BTC.b (cross-chain Bitcoin) balance |
| `get_balance` | Get both LBTC and BTC.b balances in a single call |
| `get_token_balance` | Check any ERC-20 token balance by contract address |
| `get_exchange_rate` | Current LBTC/BTC exchange rate and minimum stake amount |
| `get_lbtc_apy` | Current LBTC base staking APY |

### BTC Staking (Native Bitcoin)

| Tool | Description |
| ---- | ----------- |
| `get_deposit_btc_address` | Get a BTC deposit address for staking, or instructions to generate one |
| `check_fee_authorization` | Check fee authorization status before address generation |
| `prepare_btc_to_lbtc_deposit` | Generate a new BTC deposit address (triggers wallet signing) |
| `get_deposit_status` | Track deposit confirmations and claimability |
| `prepare_claim_lbtc_deposit` | Claim a notarized deposit to mint LBTC |

### Asset conversions (EVM)

| Tool | Description |
| ---- | ----------- |
| `prepare_btcb_to_lbtc_stake` | Stake BTC.b to receive LBTC on the same chain |
| `prepare_lbtc_to_btc` | Cross-chain LBTC redemption to native Bitcoin (requires Bitcoin recipient) |
| `prepare_lbtc_to_btcb` | Same-chain LBTC redemption to BTC.b (no Bitcoin recipient needed) |
| `prepare_redeem_btcb` | BTC.b to native Bitcoin redemption (requires Bitcoin recipient) |
| `get_redemption_status` | Track in-flight LBTC unstakes and BTC.b redemptions |

### Bitcoin Earn

| Tool | Description |
| ---- | ----------- |
| `get_earn_strategies` | List available yield strategies with APY and TVL |
| `get_lbtc_defi_opportunities` | Browse LBTC DeFi opportunities across protocols |
| `get_earn_positions` | Check Bitcoin Earn positions (shares and LBTC value) |
| `get_earn_withdrawals` | All Bitcoin Earn withdrawals (open, fulfilled, cancelled, expired) |
| `prepare_earn_deposit` | Deposit LBTC into Bitcoin Earn for additional yield |
| `prepare_earn_withdrawal` | Request a Bitcoin Earn withdrawal (one active per user per vault) |
| `prepare_cancel_earn_withdrawal` | Cancel an active Bitcoin Earn withdrawal |

### Portfolio and rewards

| Tool | Description |
| ---- | ----------- |
| `get_lux_points` | Current-season Lux reward points (holding, protocol, referral, badge) |
| `get_positions_summary` | Aggregated portfolio summary (total BTC value, PnL, holdings and DeFi breakdown) |

### Morpho Blue (Lending and Borrowing)

| Tool | Description |
| ---- | ----------- |
| `get_morpho_lbtc_markets` | List Morpho Blue markets where LBTC is collateral |
| `prepare_morpho_supply_collateral` | Supply LBTC as collateral on Morpho Blue |
| `prepare_morpho_borrow` | Borrow against LBTC collateral |
| `prepare_morpho_repay` | Repay borrowed assets |
| `get_morpho_position` | Check collateral, borrows, LTV, and health status |

## System Prompt

The package includes `LOMBARD_SYSTEM_PROMPT`, a curated prompt that teaches any LLM how to guide users through:

- Native BTC staking (deposit, confirm, claim LBTC)
- BTC.b to LBTC staking on EVM chains
- Yield strategies and Bitcoin Earn deployment
- Morpho Blue collateral supply and borrowing
- Error handling and common edge cases

Use it as-is or extend it with your own context:

```typescript
import { LOMBARD_SYSTEM_PROMPT } from "@lombard.finance/sdk-agent";

const customPrompt = `${LOMBARD_SYSTEM_PROMPT}\n\nAdditional context: ...`;
```

## Supported Chains

| Chain | Chain ID | Environment |
| ----- | -------- | ----------- |
| Ethereum | 1 | Production |
| Base | 8453 | Production |
| Sepolia | 11155111 | Testnet |
| Base Sepolia | 84532 | Testnet |

## Architecture

Tools follow a **read vs. write** pattern:

- **Read tools** execute immediately and return current state (balances, rates, statuses, market data)
- **Write tools** return transaction parameters for the user's wallet to sign (no private keys needed)

Every tool definition includes both a **Zod schema** (for TypeScript and frameworks that accept Zod) and a **JSON Schema** (for everything else):

```typescript
import {
  StakeZod,           // Zod schema
  StakeSchema,        // JSON Schema equivalent
} from "@lombard.finance/sdk-agent";
```

## Configuration

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `LOMBARD_PARTNER_ID` | `lombardtest1` | Mainnet Partner ID for BTC deposit address generation. The default is a non-revenue test partner, set this explicitly for production traffic. |
| `LOMBARD_TESTNET_PARTNER_ID` | `test1` | Testnet Partner ID. Mainnet and testnet partner registries are separate. |
| `LOMBARD_BFF_URL` | `https://bff.prod.lombard-fi.com` | Backend API URL |

## Requirements

- **Node.js**: 18+
- **TypeScript**: 5.0+
- **viem**: 2.21+

## License

MIT
