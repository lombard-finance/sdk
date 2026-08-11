# Lombard SDK

Multi-chain TypeScript SDK for Bitcoin staking and DeFi. Monorepo with Yarn 4 workspaces + Turborepo.

## Monorepo Structure

```
packages/
  sdk/              # Main EVM SDK (@lombard.finance/sdk)
  sdk-common/       # Shared types/utils (@lombard.finance/sdk-common)
  sdk-react/        # React hooks (@lombard.finance/sdk-react)
  sdk-devtools/     # Developer tools (@lombard.finance/sdk-devtools)
  sdk-solana/       # Solana integration (@lombard.finance/sdk-solana)
  sdk-sui/          # Sui integration (@lombard.finance/sdk-sui)
  sdk-starknet/     # Starknet integration (@lombard.finance/sdk-starknet)
apps/
  example-evm/      # EVM example app
  example-solana/   # Solana example app
  example-sui/      # Sui example app
  example-starknet/ # Starknet example app
```

## Commands

All commands use yarn. Never use npm.

### Root-level (turbo)

```bash
yarn build                    # Build all packages
yarn lint                     # Lint all packages
yarn test                     # Test all packages
yarn test:required            # CI gate tests (unit + mocked integration)
yarn test:unit                # Unit tests only
yarn format                   # Prettier format all
```

### Per-package

```bash
# Build/lint a specific package:
npx turbo build --filter=@lombard.finance/sdk
npx turbo lint --filter=@lombard.finance/sdk

# Test a specific package:
yarn workspace @lombard.finance/sdk-react test
yarn workspace @lombard.finance/sdk-solana test
```

### SDK package (from packages/sdk/)

```bash
npx vitest run --config vitest.unit.config.ts          # Unit tests
npx vitest run --config vitest.integration.config.ts   # Mocked integration
npx tsc --noEmit                                        # Type check
```

## Build System

- **Build tool**: Vite 6 with Rollup (dual output: ESM `.js` + CJS `.cjs`)
- **Type checking**: TypeScript 5.4 strict mode
- **Path aliases**: `api` -> `src/api-functions`, `chains` -> `src/chains`, etc. (defined in vite.config.ts)
- **Peer deps externalized**: viem, bitcoinjs-lib, axios, bignumber.js, LayerZero

## Code Standards

### Linting (ESLint 9)

- `@typescript-eslint/no-explicit-any` - error
- `unused-imports/no-unused-imports` - error
- `simple-import-sort` - enforced import ordering
- `no-console` - error
- Max warnings: 0 (all warnings are errors in CI)
- Unused vars prefixed with `_` are allowed

### Formatting

Prettier 3.2 with default config. Run `yarn format` before committing.

### Commit Messages

Conventional commits. Body explains why, not what.

```
fix: description
feat: description
chore: description
```

### Git Rules

- Stage specific files, never `git add -A` or `git add .`
- Never force push to main
- Never skip pre-commit hooks

### Open Source Boundaries

This is a public repository. Never include references to internal tools, URLs, or ticket systems (Jira, Confluence, Slack, etc.) in code, commits, PRs, or comments visible in the repo.

Code comments, commit messages, and PR descriptions are published the moment they are pushed. They may only contain technical context that is evident from the code itself:

- State the technical constraint that requires a change ("the node rejects query strings"), never the business reason behind it.
- Never mention partners, customers, vendors, or counterparties, by name or by hint.
- Never reference internal discussions, decisions, meetings, incidents, or outages.
- Never include ticket IDs, internal document links, or names of internal systems.
- If a change needs internal context to be understood, record that context internally and keep the public comment purely technical.

When in doubt, leave the comment out. The public repo is the wrong place for "why we decided this."

## Development Rules

### Code Changes

- Read and understand existing patterns before modifying files.
- Keep entry points (`src/entries/`) minimal. They re-export from internal modules.
- Every new feature or bugfix needs tests. Unit tests at minimum.
- For SDK changes, run the full CI gate: unit + mocked integration.
- Externalize peer dependencies. Never bundle viem, axios, bignumber.js, or LayerZero packages.

### Multi-Chain Boundaries

- Chain-specific logic goes in `packages/sdk-<chain>/` or `packages/sdk/src/chains/<chain>/`.
- Shared types and utilities go in `packages/sdk-common/`.
- Never import chain-specific code from the wrong chain module.

### Dependency Management

- Check license compatibility before adding dependencies (`yarn licenses:check`).
- Prefer peer dependencies for large libraries consumers already have.
- Pin versions in root `resolutions` when multiple packages need the same version.

## Testing

### Test Tiers

1. **Unit** (`vitest.unit.config.ts`) - fast, isolated, no network
2. **Mocked integration** (`vitest.integration.config.ts`) - API calls mocked
3. **Online integration** (`vitest.integration.online.config.ts`) - real API calls, opt-in via `ENABLE_ONLINE_INTEGRATION=true`

### CI Gate (must pass)

- `@lombard.finance/sdk` unit + mocked integration
- `@lombard.finance/sdk-react`, `sdk-devtools`, `sdk-solana` full suites
- All example apps build successfully

### Test Wallets

Per-chain test wallets configured via `.env` (see `.env.example`).

## Ship Workflow

1. Version bump in `packages/sdk/package.json`
2. Update `packages/sdk/CHANGELOG.md`
3. Lint, build, type check: `npx turbo lint build --filter=@lombard.finance/sdk && cd packages/sdk && npx tsc --noEmit`
4. Tests: `cd packages/sdk && npx vitest run`
5. Stage specific files, commit with conventional format, push

## License Policy

Allowed: MIT, Apache-2.0, ISC, BSD variants. Denied: GPL, AGPL, SSPL. Run `yarn licenses:check` to validate.
