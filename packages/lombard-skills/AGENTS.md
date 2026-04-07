# Lombard Finance

Lombard Finance is a Bitcoin liquid staking protocol that enables users to stake their BTC and receive LBTC (Lombard Staked Bitcoin), a yield-bearing token backed by Bitcoin staked through the Babylon staking protocol. LBTC accrues staking yield over time, meaning 1 LBTC is always worth slightly more than 1 BTC, and remains fully liquid for use across DeFi.

The protocol operates across multiple chains, allowing users to stake BTC from any supported network and deploy their LBTC into DeFi vaults for additional yield on top of the base staking rewards.

## Primary Entry Point

All SDK usage starts with `createLombardSDK()`:

```typescript
import { createLombardSDK, Env } from '@lombard.finance/sdk';

const sdk = await createLombardSDK({
  env: Env.prod,
  providers: {
    evm: () => window.ethereum,
    bitcoin: () => bitcoinProvider,
  },
});
```

This returns a `LombardSDK` instance with three main namespaces:
- `sdk.chain.btc.*` - BTC workflow actions (stake, deposit, stakeAndDeploy, depositAndDeploy)
- `sdk.chain.evm.*` - EVM workflow actions (stake, unstake, deploy, redeem, withdraw, cancelWithdraw, deposit)
- `sdk.api.*` - Data-fetching operations (deposits, unstakes, points, exchangeRatio, depositAddress, vaultWithdrawals)

## Key Concepts

### LBTC (Lombard Staked Bitcoin)
LBTC is a yield-bearing ERC-20 token representing Bitcoin staked through Lombard via the Babylon staking protocol. It uses 8 decimals (matching BTC precision). The exchange rate between LBTC and BTC increases over time as staking yield accrues, so 1 LBTC is always worth >= 1 BTC.

### BTC.b (Wrapped Bitcoin)
BTC.b is a 1:1 wrapped Bitcoin token on EVM chains. It serves as the primary input for on-chain staking (BTC.b to LBTC) and can also be deposited into certain DeFi vaults. BTC.b also uses 8 decimals.

### Action Lifecycle Pattern
All workflow classes follow a consistent lifecycle:

```
IDLE -> [authorization step] -> READY -> COMPLETED/ADDRESS_READY
```

**BTC actions** (stake, deposit, stakeAndDeploy, depositAndDeploy):
1. `prepare()` - validate params, check existing state
2. `authorize()` / `authorizeDeposit()` - wallet signature (fee auth, address confirmation, or permit)
3. `generateDepositAddress()` - get BTC deposit address from API
4. User sends BTC, then `monitorDeposit()` tracks progress

**EVM actions** (unstake, deploy, redeem, withdraw):
1. `prepare()` - validate params, check allowances
2. `authorizeFee()` / `approve()` - fee signature or token approval if needed
3. `execute()` - submit transaction

**Error handling**: There is no `failed` status. Errors stay at the step where they occurred, allowing easy retry by calling the same method again.

### BTC Workflow Classes (sdk.chain.btc.*)

| Class | Flow | Description |
|-------|------|-------------|
| `BtcStake` | BTC -> LBTC | Full native BTC staking with deposit address generation |
| `BtcDeposit` | BTC -> BTC.b | BTC custody with BTC.b minting |
| `BtcStakeAndDeploy` | BTC -> LBTC -> Vault | Atomic StakeAndBake (staking + vault deposit) |
| `BtcDepositAndDeploy` | BTC -> BTC.b -> Vault | Atomic deposit + vault deploy |

### EVM Workflow Classes (sdk.chain.evm.*)

| Class | Flow | Description |
|-------|------|-------------|
| `EvmStake` | BTC.b -> LBTC | On-chain staking via Asset Router |
| `EvmUnstake` | LBTC -> BTC or LBTC -> BTC.b | Cross-chain or same-chain unstaking |
| `EvmDeposit` | BTC.b -> LBTC | Claim notarized deposit |
| `EvmDeploy` | LBTC -> Vault | Deploy to DeFi vault |
| `EvmRedeem` | BTC.b -> BTC | Cross-chain BTC.b redemption |
| `EvmWithdraw` | Vault -> LBTC | Queue vault withdrawal |
| `EvmCancelWithdraw` | Cancel withdrawal | Cancel pending vault withdrawal |

## Supported Chains

Query supported chains programmatically via `SUPPORTED_CHAINS` from `@lombard.finance/sdk-agent`. Always verify at runtime since new chains may be added. Ethereum and Sepolia require EIP-712 fee authorization for staking (check with `requiresAutoMintFee()`).

## Key Operations

- **Native BTC Deposit**: Generate a BTC deposit address (requires wallet signature), send native BTC, monitor confirmations, receive LBTC on destination chain.
- **Stake BTC.b to LBTC**: Convert BTC.b to LBTC on any supported chain. May require fee authorization or token approval depending on chain.
- **StakeAndBake**: BTC to LBTC to Vault in one atomic operation via BtcStakeAndDeploy.
- **Unstake LBTC**: Cross-chain to native BTC (requires BTC recipient address) or same-chain to BTC.b.
- **Redeem BTC.b to BTC**: Cross-chain BTC.b to native BTC redemption.
- **Deploy to DeFi Vaults**: Deposit LBTC into yield vaults (e.g., Veda) for additional yield.
- **Vault Withdrawals**: Queue, track, and cancel vault withdrawals.
- **Check Balances**: Read LBTC and BTC.b balances for any wallet address.
- **Get Exchange Rate**: Query current LBTC/BTC exchange ratio (NOT 1:1). Always check before operations.
- **Track Operations**: Monitor deposits, unstakes, and vault withdrawals through sdk.api.*.
- **Claim Operations**: Claim notarized deposits (claimLBTC) and unstake redemptions (claimUnstakeRedeem).

## SDK and Agent Packages

### Core SDK
- **`@lombard.finance/sdk`** (>= 4.4.0): Main TypeScript SDK. Provides `createLombardSDK()`, all workflow classes, API functions, and utilities. Requires `viem` as a peer dependency.
- **`@lombard.finance/sdk-common`**: Shared types and utilities across SDK packages.
- **`@lombard.finance/sdk-react`**: React hooks: `useLombardSDK`, `useBtcStake`, `useBtcStakeAndBake`, `useEvmUnstake`.

### Agent Tooling
- **`@lombard.finance/sdk-agent`**: Framework-agnostic tool definitions (11 tools). Adapters for Vercel AI SDK and LangChain. Includes `SUPPORTED_CHAINS` for runtime chain discovery.
- **`@lombard.finance/sdk-agentkit`**: Coinbase AgentKit ActionProvider that wraps Lombard operations for autonomous agents.

### MCP Server
- **`@lombard.finance/mcp-server`**: Model Context Protocol server exposing Lombard read operations as MCP tools. Usable from Claude Desktop, Claude Code, Cursor, and any MCP-compatible client.

## Links

- SDK on npm: https://www.npmjs.com/package/@lombard.finance/sdk
- Documentation: https://docs.lombard.finance
- GitHub: https://github.com/lombard-finance/sdk
