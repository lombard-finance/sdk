/**
 * Route labels and registry-token resolution
 *
 * `resolveRegistryToken` is the fund-relevant part of this module. It exists
 * because `AssetId.LBTC` and `Token.LBTC` are the same string, `'LBTC'`, and
 * `DEFI_REGISTRY` keys off the *input* token rather than the output asset.
 *
 * @module core/actions/route
 */

import type { DefiRegistryToken } from '../../defi/defi-registry';
import { DEFI_REGISTRY } from '../../defi/defi-registry';
import { Token } from '../../tokens/token-addresses';
import { AssetId } from '../assets/types';

/**
 * Which journey an action instance is running.
 *
 * After the merges one class covers several journeys — `BtcDeposit` covers four
 * and `EvmWithdraw` covers two — so `constructor.name` no longer identifies
 * what failed. `LogMeta` carries this into `toSentryContext()` for the same
 * reason: without it, every log line loses the ability to say which journey
 * broke, during exactly the window partners are filing migration bugs.
 */
export type RouteLabel =
  | 'btc-to-lbtc'
  | 'btc-to-btcb'
  | 'btc-to-vault'
  | 'btcb-to-lbtc'
  | 'btcb-to-btc'
  | 'lbtc-to-btc'
  | 'lbtc-to-btcb'
  | 'lbtc-to-vault'
  | 'btcb-to-vault'
  | 'vault-to-lbtc'
  | 'vault-to-btcb'
  | 'claim'
  | 'cancel-withdraw';

/** Which SDK namespace a call came through. */
export type ActionNamespace = 'btc' | 'evm' | 'solana' | 'sui' | 'starknet';

/** A signature ceremony an action may need before `execute()`. */
export type AuthorizationGroup =
  | 'approval'
  | 'fee'
  | 'address-confirmation'
  | 'vault-deposit';

// ═══════════════════════════════════════════════════════════════════════════
// Registry token resolution
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The (namespace, asset) pairs that reach `DEFI_REGISTRY`, and the key each one
 * must use.
 *
 * ## Why this is a table and not `assetIdToToken(asset)`
 *
 * A BTC-source vault deposit must resolve to the **virtual `'BTC'` key**, which
 * carries `amountStrategy: 'btcToLbtc'` and divides by the BTC/LBTC ratio.
 * Resolving to `'LBTC'` instead selects `identity` and authorises the raw
 * satoshi amount.
 *
 * v5 defended this with a runtime throw unless `assetIn === AssetId.BTC`.
 * `DeployParams` has no `assetIn`, so that guard has nothing left to check, and
 * the derivation an implementer would naturally reach for —
 * `assetIdToToken(params.asset)` — produces the wrong key for the LBTC route.
 * Both spellings type-check, and only one is right.
 */
/** The synthetic registry key that means "native BTC as an input denomination". */
const VIRTUAL_BTC_KEY = 'BTC';

const REGISTRY_TOKEN_TABLE = {
  // LBTC has a variable ratio to BTC, so the virtual key is the only one whose
  // amount strategy converts. Note the asset id here is 'LBTC', the same string
  // as Token.LBTC, which is exactly why this must not be derived.
  'btc:LBTC': VIRTUAL_BTC_KEY,
  // BTC.b is 1:1 with BTC, so no conversion is wanted.
  'btc:BTC.b': Token.BTCb,
  // The input already is LBTC.
  'evm:LBTC': Token.LBTC,
  // The input already is BTC.b.
  'evm:BTC.b': Token.BTCb,
} as const satisfies Record<string, DefiRegistryToken>;

type RegistryTokenKey = keyof typeof REGISTRY_TOKEN_TABLE;

/** The namespaces that can reach a vault. */
export type DeployNamespace = 'btc' | 'evm';

/** The assets that can be deployed into a vault. */
export type DeployAsset = typeof AssetId.LBTC | typeof AssetId.BTCb;

/**
 * Resolves the `DEFI_REGISTRY` key for a deploy, from the namespace **and** the
 * asset — never from the asset alone.
 *
 * @throws when the pair is not in the table, which is preferable
 * to guessing a key whose amount strategy may be wrong.
 */
export function resolveRegistryToken(
  namespace: DeployNamespace,
  asset: DeployAsset,
): DefiRegistryToken {
  const key = `${namespace}:${asset}` as RegistryTokenKey;

  // `hasOwn` rather than an undefined check: it distinguishes "no row for this
  // pair" from "a row whose value happens to be undefined", and the first is
  // the only condition that should throw.
  if (!Object.hasOwn(REGISTRY_TOKEN_TABLE, key)) {
    throw new Error(
      `No registry token for ${namespace}/${asset}. A deploy must resolve its ` +
        `key from the route table, because deriving it from the asset alone ` +
        `selects the wrong amount strategy for BTC-source LBTC.`,
    );
  }

  return REGISTRY_TOKEN_TABLE[key];
}

/** Every (namespace, asset) pair the table covers, for parameterised tests. */
export const REGISTRY_TOKEN_ROWS = [
  { namespace: 'btc', asset: AssetId.LBTC, registryToken: 'BTC' },
  { namespace: 'btc', asset: AssetId.BTCb, registryToken: Token.BTCb },
  { namespace: 'evm', asset: AssetId.LBTC, registryToken: Token.LBTC },
  { namespace: 'evm', asset: AssetId.BTCb, registryToken: Token.BTCb },
] as const satisfies readonly {
  namespace: DeployNamespace;
  asset: DeployAsset;
  registryToken: DefiRegistryToken;
}[];

// ═══════════════════════════════════════════════════════════════════════════
// Route labels
// ═══════════════════════════════════════════════════════════════════════════

/** The slug each asset contributes to a route label. */
const ASSET_SLUGS: Partial<Record<AssetId, string>> = {
  [AssetId.BTC]: 'btc',
  [AssetId.BTCb]: 'btcb',
  [AssetId.LBTC]: 'lbtc',
};

/** What a route label can be derived from. */
export interface RouteLabelParams {
  assetIn?: AssetId;
  assetOut?: AssetId;
  protocol?: string;
}

/**
 * Derives the label for a journey from its assets and protocol.
 *
 * Derived rather than declared per class so the label cannot drift from the
 * parameters it describes — which matters because after the merges one class
 * covers several journeys, and the label is what `LogMeta` and
 * `toSentryContext()` use to say which one failed.
 *
 * A vault leg is named by the asset on the non-vault side, since the share
 * token has no `AssetId` to name.
 *
 * @throws when the combination has no label, rather than
 * inventing one that would then appear in logs as fact.
 */
export function deriveRouteLabel(params: RouteLabelParams): RouteLabel {
  const { assetIn, assetOut, protocol } = params;

  if (protocol) {
    // Into a vault: the asset going in names it. Out of a vault: the asset
    // coming out does. Exactly one of the two is present on a vault route.
    const asset = assetIn ?? assetOut;
    const slug = asset ? ASSET_SLUGS[asset] : undefined;

    if (slug) {
      return (assetIn ? `${slug}-to-vault` : `vault-to-${slug}`) as RouteLabel;
    }
  } else if (assetIn && assetOut) {
    const from = ASSET_SLUGS[assetIn];
    const to = ASSET_SLUGS[assetOut];

    if (from && to) {
      return `${from}-to-${to}` as RouteLabel;
    }
  }

  throw new Error(
    `No route label for assetIn=${String(assetIn)} assetOut=${String(assetOut)} ` +
      `protocol=${String(protocol)}. A label appears in logs as fact, so an ` +
      `unknown combination throws rather than guessing.`,
  );
}

/**
 * Which asset a protocol's vault is denominated in.
 *
 * A vault exit names no asset in its parameters — `EvmWithdrawParams` carries
 * only a protocol and a chain — so the label has to come from the registry
 * rather than from the call. Reading it here means a protocol added to
 * `DEFI_REGISTRY` is labelled without a second edit.
 *
 * Veda holds both a real LBTC key and the virtual `'BTC'` one used for
 * conversion; the virtual key is skipped, since it names an input denomination
 * rather than what the vault holds.
 *
 * @throws when the protocol has no registry entry.
 */
export function vaultAsset(protocol: string): AssetId {
  const entry = (DEFI_REGISTRY as Record<string, Record<string, unknown>>)[
    protocol
  ];

  // Asks which real token the vault holds, rather than "whichever key is not
  // the virtual one". Same answer today, but it says what it means: the virtual
  // BTC key names an input denomination, not a holding, so it is never the
  // vault's asset however many keys a protocol grows.
  if (entry) {
    if (Object.hasOwn(entry, Token.LBTC)) return AssetId.LBTC;
    if (Object.hasOwn(entry, Token.BTCb)) return AssetId.BTCb;
  }

  throw new Error(
    `No vault asset for protocol '${protocol}'. A route label appears in logs ` +
      `as fact, so an unregistered protocol throws rather than guessing.`,
  );
}
