# 0.3.0

## 🚨 BREAKING CHANGES

Requires `@lombard.finance/sdk@6.0.0`. The SDK is a dependency here rather than a peer, and the publish step rewrites `workspace:*` dependencies to the exact version — so `0.2.0` on the registry pins `5.5.0` and installs the pre-6.0.0 API no matter what the consumer asks for. A new version is the only way to ship an agent that runs against 6.0.0.

No tool names, dispatch methods or schemas change in this release. The eleven `btc.*` / `evm.*` dispatch methods and the three `morpho.*` methods are exactly as in 0.2.0, so an app layer that routes on `method` needs no edit. What changed is which SDK the prepared calls are dispatched against: see the SDK's own 6.0.0 entry, and the migration guide at https://docs.lombard.finance/build/sdk/migrating-to-v6.

# 0.2.0

## 🚨 BREAKING CHANGES

Full naming pass across the public tool surface and dispatch method strings, intended to eliminate the footguns that previously required documentation callouts. No deprecation aliases, hard rename. This is appropriate at 0.x because the 0.1.x line has effectively no install base.

### Renamed tools (and their dispatch methods)

| Before | After |
| --- | --- |
| `prepare_btc_deposit` (always minted LBTC) | `prepare_btc_to_lbtc_deposit` (dispatch: `btc.generateLbtcDepositAddress`) |
| `prepare_stake` (BTC.b → LBTC) | `prepare_btcb_to_lbtc_stake` (dispatch: `evm.btcbToLbtc`) |
| `prepare_claim_deposit` (LBTC only) | `prepare_claim_lbtc_deposit` (dispatch: `evm.claimLbtcDeposit`) |
| `prepare_deploy_to_vault` | `prepare_earn_deposit` (dispatch: `evm.earnDeposit`) |
| `prepare_vault_withdrawal` | `prepare_earn_withdrawal` (dispatch: `evm.earnWithdrawal`) |
| `prepare_cancel_withdrawal` | `prepare_cancel_earn_withdrawal` (dispatch: `evm.cancelEarnWithdrawal`) |
| `get_vault_positions` | `get_earn_positions` |
| `get_vault_withdrawals` | `get_earn_withdrawals` |
| `get_unstake_status` | `get_redemption_status` |
| `get_strategies` | `get_earn_strategies` |
| `get_opportunities` | `get_lbtc_defi_opportunities` |
| `prepare_redeem_btcb` (unchanged) | `prepare_redeem_btcb` (dispatch: `evm.btcbToBtc`, was `evm.redeemBtcb`) |

### Split: `prepare_unstake` → two tools

The overloaded `prepare_unstake` with `outputAsset: "BTC" | "BTCb"` is gone. It is replaced by two distinct tools, each with its own schema and dispatch method:

- `prepare_lbtc_to_btc` (dispatch: `evm.lbtcToBtc`) — cross-chain LBTC redemption to native Bitcoin. Requires a Bitcoin `recipient` address.
- `prepare_lbtc_to_btcb` (dispatch: `evm.lbtcToBtcb`) — same-chain LBTC redemption to BTC.b. No recipient needed.

Renamed validator: `validateUnstakeInputs` is gone, replaced by `validateLbtcToBtcInputs` and `validateLbtcToBtcbInputs`. Schemas `UnstakeZod` / `UnstakeSchema` are removed; new schemas `LbtcToBtcZod` / `LbtcToBtcSchema` and `LbtcToBtcbZod` / `LbtcToBtcbSchema` take their place.

### Re-exports added (previously unreachable)

Three read tools were defined in `tools.ts` but never re-exported from `index.ts` and never added to `allTools`, so they were unreachable through the Vercel and LangChain adapters. They now appear in both. They are also subject to the renames above:

- `getEarnWithdrawalsTool` (tool name `get_earn_withdrawals`)
- `getLuxPoints` (tool name `get_lux_points`)
- `getPositionsSummaryTool` (tool name `get_positions_summary`)

### Fixed

- `LOMBARD_SYSTEM_PROMPT` updated to reference the new tool names and the post-split `prepare_lbtc_to_btc` / `prepare_lbtc_to_btcb` flows.
- `README.md` Configuration table: `LOMBARD_PARTNER_ID` default is `lombardtest1` (was incorrectly documented as "none"); added the missing `LOMBARD_TESTNET_PARTNER_ID` row with default `test1`.

### Migration

In any agent code that switches on the dispatch method:

```ts
// before
if (r.method === 'evm.stake') { /* ... */ }
if (r.method === 'evm.unstake' && r.params.outputAsset === 'BTC') { /* ... */ }
if (r.method === 'evm.unstake' && r.params.outputAsset === 'BTCb') { /* ... */ }
if (r.method === 'evm.redeemBtcb') { /* ... */ }
if (r.method === 'evm.deploy') { /* ... */ }

// after
if (r.method === 'evm.btcbToLbtc') { /* ... */ }
if (r.method === 'evm.lbtcToBtc') { /* ... */ }
if (r.method === 'evm.lbtcToBtcb') { /* ... */ }
if (r.method === 'evm.btcbToBtc') { /* ... */ }
if (r.method === 'evm.earnDeposit') { /* ... */ }
```

If you imported individual tools, update the named imports: `prepareUnstake` → `prepareLbtcToBtc` / `prepareLbtcToBtcb`; `prepareStake` → `prepareBtcbToLbtcStake`; `prepareDeployToVault` → `prepareEarnDeposit`; etc.

---

# 0.1.0

Initial release.
