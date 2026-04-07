# @lombard.finance/mcp-server

MCP (Model Context Protocol) server for the Lombard Bitcoin staking protocol. Exposes read-only tools to query LBTC balances, exchange rates, deposit/unstake status, and DeFi yield strategies. Works with Claude Desktop, Claude Code, Cursor, VS Code Copilot, and any MCP-compatible client.

## Quick Setup

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lombard": {
      "command": "npx",
      "args": ["-y", "@lombard.finance/mcp-server"],
      "env": { "LOMBARD_ENV": "mainnet" }
    }
  }
}
```

### Claude Code

Add to `.mcp.json` in your project root (or `~/.claude/.mcp.json` globally):

```json
{
  "mcpServers": {
    "lombard": {
      "command": "npx",
      "args": ["-y", "@lombard.finance/mcp-server"],
      "env": { "LOMBARD_ENV": "mainnet" }
    }
  }
}
```

### Cursor

Add via Settings > MCP Servers > Add:

```json
{
  "lombard": {
    "command": "npx",
    "args": ["-y", "@lombard.finance/mcp-server"],
    "env": { "LOMBARD_ENV": "mainnet" }
  }
}
```

## Available Tools

| Tool | Description |
|---|---|
| `get_lbtc_balance` | Check LBTC (Lombard Staked Bitcoin) balance for a wallet address |
| `get_btcb_balance` | Check BTC.b (wrapped Bitcoin) balance for a wallet address |
| `get_balance` | Check both LBTC and BTC.b balances in a single call |
| `get_exchange_rate` | Get the current LBTC/BTC exchange rate and minimum stake amount |
| `get_deposit_status` | Check the status of all deposits for an address |
| `get_unstake_status` | Check the status of all unstake/redeem operations for an address |
| `get_strategies` | List available DeFi vault strategies with APY and TVL |
| `get_deposit_btc_address` | Get the BTC deposit address for staking to receive LBTC |

## Configuration

### LOMBARD_ENV

Set the `LOMBARD_ENV` environment variable to control which network the server queries:

| Value | Description | Default Chain ID |
|---|---|---|
| `mainnet` (default) | Ethereum Mainnet, Base | 1 |
| `testnet` | Sepolia, Base Sepolia | 11155111 |

When a tool call does not include a `chainId` parameter, the server uses the default chain ID for the configured environment.

## Related Packages

- [`@lombard.finance/sdk-agent`](../sdk-agent) - Framework-agnostic tool definitions (the foundation this server wraps)
- [`@lombard.finance/sdk-agentkit`](../sdk-agentkit) - Coinbase AgentKit action provider (supports write operations)
- [`@lombard.finance/sdk`](../sdk) - Core Lombard SDK for direct integration

## License

MIT
