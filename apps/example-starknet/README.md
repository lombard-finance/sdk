# Lombard SDK - Starknet Example

Example app demonstrating BTC staking, LBTC claiming, and unstaking on Starknet using the [Lombard SDK](https://docs.lombard.finance).

## Prerequisites

- Node.js >= 22.14.0
- Yarn 4
- A Starknet wallet (Argent X, Braavos)

## Setup

```bash
# From the repository root
yarn install

# Configure environment
cp .env.example .env
# Edit .env with your settings:
#   VITE_ENV=testnet        # or "prod" / "stage"
#   VITE_PARTNER_ID=your-partner-id

# Start the dev server
yarn workspace @lombard.finance/example-starknet dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `dev` | Start Vite dev server |
| `build` | Type-check and build for production |
| `preview` | Preview the production build |
| `test` | Run tests |

## What's demonstrated

- **BTC Staking** - Generate a deposit address, send BTC, receive LBTC on Starknet
- **LBTC Claiming** - Claim minted LBTC after BTC confirmations
- **Unstaking** - Burn LBTC on Starknet to receive BTC
- **Wallet connection** - Starknet wallet integration (Argent X, Braavos)

## License

MIT
