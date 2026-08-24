/**
 * Parse the exported names out of a module's source.
 *
 * Static parsing rather than importing, because much of this package's public
 * surface is type-only and a type is invisible to `Object.keys(await
 * import(…))`. It also needs no build step, so the checks that use it run in the
 * plain unit tier.
 *
 * Shared by the export-name snapshot and the contract-reachability check.
 * Previously each had its own copy, and a parsing bug in the copy was therefore
 * a hole in both: comments were stripped *after* splitting an export list on
 * commas, so a multi-line `//` comment containing a comma left its tail glued to
 * the name that followed it. That name then failed the identifier test and was
 * dropped — silently, since a missing name in a snapshot looks like a name that
 * was never exported. One real export was lost that way.
 *
 * @module __tests__/helpers/collectExports
 */

/**
 * Remove `//` line comments and block comments.
 *
 * Runs on the whole block before any splitting, which is the ordering that
 * matters: commas inside prose are only harmless once the prose is gone.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * Exported names in a module's source, sorted.
 *
 * Handles the three forms this codebase uses:
 *   export { a, b as c } from '…'      // re-export lists, incl. multi-line
 *   export type { X } from '…'
 *   export const / function / class / interface / type / enum X
 *
 * `export *` is deliberately unsupported: it would make the surface
 * non-enumerable without resolving the target, and a separate assertion keeps
 * it absent from every entry point.
 */
export function collectExports(source: string): string[] {
  const clean = stripComments(source);
  const names = new Set<string>();

  // Braced export lists, including `export type { … }` and multi-line bodies.
  const braced = clean.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g);
  for (const match of braced) {
    for (const raw of match[1].split(',')) {
      const part = raw.replace(/\btype\b/g, '').trim();
      if (!part) continue;
      // `X as Y` exports Y; a bare `X` exports X.
      const asMatch = part.match(/\bas\s+([A-Za-z_$][\w$]*)/);
      const name = asMatch ? asMatch[1] : part;
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }

  // Direct declarations.
  const declared = clean.matchAll(
    /export\s+(?:declare\s+)?(?:abstract\s+)?(?:const|let|var|function\*?|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g,
  );
  for (const match of declared) names.add(match[1]);

  return [...names].sort();
}
