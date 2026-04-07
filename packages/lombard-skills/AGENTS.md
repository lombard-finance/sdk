# Lombard Finance

Lombard Finance is a Bitcoin liquid staking protocol that enables users to stake their BTC and receive LBTC (Lombard Staked Bitcoin), a yield-bearing token backed 1:1 by Bitcoin staked through the Babylon staking protocol. LBTC accrues staking yield over time, meaning 1 LBTC is always worth slightly more than 1 BTC, and remains fully liquid for use across DeFi.

The protocol operates across multiple EVM chains, allowing users to stake BTC from any supported network and deploy their LBTC into DeFi vaults for additional yield on top of the base staking rewards.

## Key Concepts

### LBTC (Lombard Staked Bitcoin)
LBTC is a yield-bearing ERC-20 token representing Bitcoin staked through Lombard via the Babylon staking protocol. It uses 8 decimals (matching BTC precision). The exchange rate between LBTC and BTC increases over time as staking yield accrues, so 1 LBTC is always worth >= 1 BTC.

### BTC.b (Wrapped Bitcoin)
BTC.b is a 1:1 wrapped Bitcoin token on EVM chains. It serves as the primary input for on-chain staking: users convert BTC.b to LBTC through the Lombard staking contract. BTC.b also uses 8 decimals.

## Supported Chains

| Chain | Chain ID | Environment | Notes |
|-------|----------|-------------|-------|
| Ethereum Mainnet | 1 | Production | Primary chain, requires fee authorization for staking |
| Base | 8453 | Production | No fee authorization required |
| Sepolia | 11155111 | Testnet | Ethereum testnet |
| Base Sepolia | 84532 | Testnet | Base testnet |

## Key Operations

- **Stake BTC.b to LBTC**: Convert BTC.b to LBTC on any supported chain. On Ethereum, requires EIP-712 fee authorization signature before staking.
- **Native BTC Deposit**: Generate a BTC deposit address, send native BTC, and receive LBTC after Lombard consortium notarization (cross-chain flow).
- **Unstake LBTC to BTC**: Cross-chain unstake that converts LBTC back to native BTC. Requires a BTC recipient address.
- **Redeem LBTC to BTC.b**: Same-chain conversion of LBTC back to BTC.b (faster than cross-chain unstake).
- **Deploy to DeFi Vaults**: Deposit LBTC into yield vaults (e.g., Veda) for additional DeFi yield on top of base staking rewards.
- **Check Balances**: Read LBTC and BTC.b balances for any wallet address on any supported chain.
- **Get Exchange Rate**: Query the current LBTC/BTC exchange ratio and minimum stake amount.
- **Track Deposits/Unstakes**: Monitor the status of pending deposits and unstake operations.
- **Get BTC Deposit Address**: Retrieve or generate a BTC deposit address for receiving LBTC via native BTC.

## SDK and Agent Packages

### Core SDK
- **`@lombard.finance/sdk`** (>= 4.4.0): Main TypeScript SDK for all Lombard operations. Provides functions for staking, unstaking, vault deployment, balance queries, and status tracking. Requires `viem` as a peer dependency.

### Agent Tooling
- **`@lombard.finance/sdk-agent`**: Framework-agnostic tool definitions for AI agents. Provides 11 tools (balance checks, exchange rates, staking, unstaking, vault deployment, deposit tracking). Includes adapters for Vercel AI SDK and LangChain.
- **`@lombard.finance/sdk-agentkit`**: Coinbase AgentKit ActionProvider that wraps Lombard operations for use with AgentKit-based agents.

### MCP Server
- **`@lombard.finance/mcp-server`**: Model Context Protocol server exposing Lombard read operations as MCP tools. Usable from Claude Desktop, Claude Code, Cursor, and any MCP-compatible client.

## Links

- SDK on npm: https://www.npmjs.com/package/@lombard.finance/sdk
- Documentation: https://docs.lombard.finance
- GitHub: https://github.com/lombard-finance/sdk
