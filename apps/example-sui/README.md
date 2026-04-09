# Lombard SDK - Sui Example

Example app demonstrating BTC staking, LBTC claiming, and unstaking on Sui using the [Lombard SDK](https://docs.lombard.finance).

## Prerequisites

- Node.js >= 22.14.0
- Yarn 4
- A Sui wallet (Sui Wallet, Suiet, etc.)

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
yarn workspace @lombard.finance/example-sui dev
```

## Scripts

| Command   | Description                         |
| --------- | ----------------------------------- |
| `dev`     | Start Vite dev server               |
| `build`   | Type-check and build for production |
| `preview` | Preview the production build        |
| `test`    | Run tests                           |

## What's demonstrated

- **BTC Staking** - Generate a deposit address, send BTC, receive LBTC on Sui
- **LBTC Claiming** - Claim minted LBTC after BTC confirmations
- **Unstaking** - Burn LBTC on Sui to receive BTC
- **Wallet connection** - Sui wallet-standard integration

## License

MIT
