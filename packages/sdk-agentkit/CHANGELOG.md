# 0.3.0

## BREAKING CHANGES

**Write actions no longer transact without an approval policy.**

A tool call was the transaction. `stake_btcb_to_lbtc`, `unstake_lbtc_to_btc`, `redeem_lbtc_to_btcb`, `deploy_to_earn` and `claim_lbtc_deposit` signed and sent as soon as they were invoked, and what invokes them is a model reading text. Not all of that text belongs to the operator: a token symbol, an address label and any error relayed from an upstream service all reach the model, and a tool call cannot be told apart from an instruction after it has been made. `unstake_lbtc_to_btc` takes its Bitcoin destination straight from a tool argument.

The only thing standing in front of that was a sentence in the example system prompts asking the model to confirm first, which is a request to the model rather than a gate.

`lombardActionProvider()` now takes one of two options, and refuses writes with neither:

```ts
lombardActionProvider({
  confirmWrite: (request) => askTheOperator(request),
});

// or, for a wallet meant to run unattended:
lombardActionProvider({ autoApproveWrites: true });
```

`confirmWrite` runs before anything is signed, the fee authorisation included — that signs an EIP-712 approval and stores it, so a write refused after it would still have left one behind. Returning `false` or throwing stops the action, which reports that it was not approved and sends nothing. Read actions are not gated.

The two options are mutually exclusive and passing both throws at construction. They contradict each other, and the way to end up with both is adding `confirmWrite` to a config that already carried `autoApproveWrites: true` — connecting an approval flow and leaving the old flag behind. Choosing a winner silently would hand unattended execution back to someone who believes they just built a gate, so it fails while the config is still in front of whoever wrote it. Should a policy object reach the check without passing through the constructor, `confirmWrite` wins there too.

### Migration

Existing integrations keep working once they say which they want. `lombardActionProvider()` with no options still constructs, and its read actions still work; its write actions return `{ success: false, error: "… no confirmation is configured …" }` until `confirmWrite` or `autoApproveWrites` is set.

### Added

- `confirmWrite`, `autoApproveWrites` on `lombardActionProvider()` / `new LombardActionProvider()`.
- `LombardActionProviderOptions`, `ConfirmWrite` and `WriteConfirmationRequest` types. The request carries `action`, `chainId`, `account`, `amount`, `assetIn`, `assetOut` and `details`, plus `recipient` when the funds land somewhere other than the signing account — absent on `unstake_lbtc_to_btc` with `outputAsset: "BTCb"`, which pays the signer and ignores the argument, so a prompt never names a destination the transaction does not use.

---

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
