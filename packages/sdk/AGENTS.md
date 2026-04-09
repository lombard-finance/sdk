# @lombard.finance/sdk

Main EVM SDK package. See the root [AGENTS.md](../../AGENTS.md) for monorepo-wide commands, standards, and workflow.

## Package Commands

```bash
npx turbo build --filter=@lombard.finance/sdk
npx turbo lint --filter=@lombard.finance/sdk
npx vitest run --config vitest.unit.config.ts          # Unit tests
npx vitest run --config vitest.integration.config.ts   # Mocked integration
npx tsc --noEmit                                        # Type check
```

## Source Layout

```
src/
  client/              # LombardSDK class, createLombardSDK factory, createConfig
  chains/evm/actions/  # stake/, deploy/, withdraw/, redeem/, deposit/
  contract-functions/  # approveLBTC/, approveToken/, etc.
  api-functions/       # API integration modules
  entries/             # Export entry points (core.ts, evm.ts, etc.)
  config/              # Environment config, chain definitions
  vaults/              # Vault operations
  bridge/              # Cross-chain bridge
  defi/                # DeFi protocol integrations
```

## Entry Points

Multiple entry points for tree-shaking: `core`, `api`, `contracts`, `btc`, `evm`, `metrics`, `utils`, `vaults`, `defi`, `bridge`, `debug`.

Entry point files live in `src/entries/`. They should be minimal re-exports from internal modules. Do not add logic to entry point files.

Consumers import as `@lombard.finance/sdk/evm`, `@lombard.finance/sdk/core`, etc.

## Action Lifecycle

All EVM actions follow: **IDLE -> NEEDS_APPROVAL -> READY -> COMPLETED**

```
prepare()  - validate params, check allowance, set state
approve()  - send approval tx, wait for receipt, transition to READY
execute()  - perform main operation
```

Rules:

- Actions (high-level) MUST wait for receipt in `approve()` before transitioning to READY
- Contract functions (low-level) return txHash only, do not wait
- Some actions (EvmRedeem, EvmDeposit) have no-op `approve()` that just flips state

## Client Pattern

```typescript
const sdk = await createLombardSDK({ env: 'prod', modules: [...] });

sdk.chain.evm.stake(...)
sdk.chain.btc.deposit(...)
sdk.api.getExchangeRatio(...)
```

Lower-level:

- `makePublicClient({ chainId })` - read-only, uses SDK RPC endpoints
- `makeWalletClient({ provider, chainId })` - wraps EIP1193 provider for transactions

## Path Aliases

Use path aliases in imports, not relative paths:

- `api` -> `src/api-functions`
- `chains` -> `src/chains`
- `client` -> `src/client`
- `config` -> `src/config`

Defined in `vite.config.ts`.

## Build Output

Dual output: ESM `.js` + CJS `.cjs` via Vite/Rollup. Peer deps externalized.

## Testing

Three tiers (see root AGENTS.md). CI gate requires unit + mocked integration to pass.
