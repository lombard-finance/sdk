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
const REGISTRY_TOKEN_TABLE = {
  // LBTC has a variable ratio to BTC, so the virtual key is the only one whose
  // amount strategy converts. Note the asset id here is 'LBTC', the same string
  // as Token.LBTC, which is exactly why this must not be derived.
  'btc:LBTC': 'BTC',
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
 * @throws {@link Error} when the pair is not in the table, which is preferable
 * to guessing a key whose amount strategy may be wrong.
 */
export function resolveRegistryToken(
  namespace: DeployNamespace,
  asset: DeployAsset,
): DefiRegistryToken {
  const key = `${namespace}:${asset}` as RegistryTokenKey;
  const token = REGISTRY_TOKEN_TABLE[key];

  if (token === undefined) {
    throw new Error(
      `No registry token for ${namespace}/${asset}. A deploy must resolve its ` +
        `key from the route table, because deriving it from the asset alone ` +
        `selects the wrong amount strategy for BTC-source LBTC.`,
    );
  }

  return token;
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
