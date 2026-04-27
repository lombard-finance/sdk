/**
 * Runtime deprecation-warning helper.
 *
 * Emits a one-time `console.warn` per (oldSymbol → newSymbol) pair when a
 * deprecated SDK function is called. Subsequent calls are silent so the warn
 * does not spam logs in hot paths.
 *
 * Suppressed entirely when the `LOMBARD_SDK_SUPPRESS_DEPRECATION` env var is
 * set to a truthy value (any non-empty string), useful for callers that have
 * already audited and intentionally pinned to a deprecated symbol.
 *
 * To be removed alongside the deprecated symbols in 5.0.0.
 */
const warned = new Set<string>();

function isSuppressed(): boolean {
  if (typeof process === 'undefined' || !process.env) return false;
  const v = process.env.LOMBARD_SDK_SUPPRESS_DEPRECATION;
  return Boolean(v && v.length > 0);
}

export function warnDeprecated(oldSymbol: string, newSymbol: string): void {
  if (isSuppressed()) return;
  const key = `${oldSymbol}→${newSymbol}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(
    `[@lombard.finance/sdk] ${oldSymbol} is deprecated and will be removed in 5.0.0. ` +
      `Use ${newSymbol} instead. ` +
      `Set process.env.LOMBARD_SDK_SUPPRESS_DEPRECATION to silence this warning.`,
  );
}
