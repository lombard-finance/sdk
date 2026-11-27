/**
 * Sentinel tx hash returned when a payload has already been processed on-chain.
 * Used by BTC.b mint and LBTC GMP flows to signal an idempotent no-op to callers.
 */
export const ALREADY_MINTED_TX_HASH = 'ALREADY_MINTED';
