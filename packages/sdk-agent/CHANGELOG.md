# 0.1.1

### Added

- Re-exported three read tools from the package root so they can be imported by name: `getVaultWithdrawalsTool` (`get_vault_withdrawals`), `getLuxPoints` (`get_lux_points`), and `getPositionsSummaryTool` (`get_positions_summary`). They were defined and individually exported in `tools.ts` but were not surfaced through `index.ts`, so a direct named import would fail.

### Fixed

- Added the same three tools to the `allTools` array so the `lombardTools` adapters (Vercel AI SDK, LangChain) pick them up. Previously the tools shipped but were unreachable via the standard adapter imports.
- Corrected the `Configuration` table in this package's README: `LOMBARD_PARTNER_ID` default is `lombardtest1` (not "none"), and the table now includes `LOMBARD_TESTNET_PARTNER_ID` (default `test1`).

---

# 0.1.0

Initial release.
