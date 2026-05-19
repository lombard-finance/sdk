# 0.2.0

## 🚨 BREAKING CHANGES

Action names harmonized with `@lombard.finance/sdk-agent@0.2.0` so the two packages tell a coherent story. No deprecation aliases, hard rename. Appropriate at 0.x because the 0.1.x line has effectively no install base.

### Renamed actions

| Before | After |
| --- | --- |
| `unstake_lbtc` | `unstake_lbtc_to_btc` |
| `deploy_to_defi` | `deploy_to_earn` |
| `claim_deposit` | `claim_lbtc_deposit` |
| `get_unstake_status` | `get_redemption_status` |

Names left unchanged because they were already clear: `stake_btcb_to_lbtc`, `redeem_lbtc_to_btcb`, `get_lbtc_balance`, `get_btcb_balance`, `get_lbtc_exchange_rate`, `get_deposit_status`.

### Migration

In any AgentKit configuration that lists actions by name (e.g. an allowlist passed to your agent runtime), update the strings: `"unstake_lbtc"` → `"unstake_lbtc_to_btc"`, `"deploy_to_defi"` → `"deploy_to_earn"`, `"claim_deposit"` → `"claim_lbtc_deposit"`, `"get_unstake_status"` → `"get_redemption_status"`.

---

# 0.1.0

Initial release.
