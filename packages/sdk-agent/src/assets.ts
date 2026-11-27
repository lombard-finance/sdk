/**
 * Canonical glossary of Lombard-related on-chain assets.
 *
 * The SDK keeps the source of truth for token addresses (getLbtcContractAddresses,
 * BTCE_VAULT_CONTRACTS, getTokenContractInfo). This module is the agent's
 * structured awareness of *what each asset is conceptually* — which one is
 * yield-bearing, which one is just bridged BTC, which one is the vault share —
 * so the LLM never has to guess and never tells the user "I'm not familiar
 * with that token."
 *
 * Anything new added to the SDK that the agent should advertise should be
 * added here. The `get_token_info` tool reads from this module, and the
 * glossary string is appended to the system prompt at module load.
 */
import {
  BTCE_VAULT_CONTRACTS,
  type ChainId,
  Env,
  getLbtcContractAddresses,
} from "@lombard.finance/sdk";

export interface LombardAsset {
  /** Canonical short symbol (LBTC, BTC.b, BTCe, ...). */
  symbol: string;
  /** Other names the LLM might encounter in conversation. */
  aliases: string[];
  /** Full human-readable name. */
  name: string;
  /** One-sentence summary the LLM can quote when asked "what is X?". */
  description: string;
  /** Whether Lombard issues this asset (vs. a third-party token we surface). */
  isLombardIssued: boolean;
  /** Whether holding the asset accrues yield over time. */
  isYieldBearing: boolean;
  decimals: number;
  /**
   * Known per-chain addresses, keyed by EVM chain ID. May be partial: assets
   * deployed on chains not enumerated here are still discoverable through
   * get_token_info's address argument or the SDK's getTokenContractInfo.
   */
  addresses: Partial<Record<number, string>>;
  /** Optional extra notes for the LLM. */
  notes?: string;
}

function mergeLbtcAddresses(): Partial<Record<number, string>> {
  // getLbtcContractAddresses is keyed by env. Merge prod first so testnet
  // entries don't override mainnet for chains that exist on both registries
  // (none currently, but be defensive).
  return {
    ...getLbtcContractAddresses(Env.testnet),
    ...getLbtcContractAddresses(Env.prod),
  };
}

/**
 * Lombard's user-facing asset roster. Order is intentional: assets users
 * interact with most directly come first.
 */
export const LOMBARD_ASSETS: LombardAsset[] = [
  {
    symbol: "LBTC",
    aliases: ["Lombard BTC", "Lombard staked Bitcoin", "lbtc"],
    name: "Lombard BTC",
    description:
      "Yield-bearing receipt token for native BTC staked via Babylon. 1 LBTC is always worth slightly more than 1 BTC and grows over time as Babylon yield accrues. The exchange rate is never 1:1 — always fetch with get_exchange_rate.",
    isLombardIssued: true,
    isYieldBearing: true,
    decimals: 8,
    addresses: mergeLbtcAddresses(),
  },
  {
    symbol: "BTC.b",
    aliases: ["BTCb", "BTC dot b", "btc.b", "Lombard cross-chain BTC"],
    name: "BTC.b",
    description:
      "Lombard's cross-chain wrapped Bitcoin token. Bridged BTC, NOT yield-bearing. Use BTC.b when the user wants wrapped BTC on an EVM chain without yield exposure.",
    isLombardIssued: true,
    isYieldBearing: false,
    decimals: 8,
    addresses: {},
    notes:
      "Per-chain BTC.b contract addresses are resolved on demand via the SDK's getTokenContractInfo(Token.BTCb, chainId, env). Call get_token_info with chainId+address for verification.",
  },
  {
    symbol: "BTCe",
    aliases: ["Bitcoin Earn token", "Bitcoin Earn vault share", "BTCE", "btce"],
    name: "Bitcoin Earn vault share (BTCe)",
    description:
      "ERC4626 wrapper share token for the Bitcoin Earn vault. Holding BTCe is how users participate in Bitcoin Earn yield; deposits via prepare_deploy_to_vault mint BTCe, withdrawals via prepare_vault_withdrawal burn it.",
    isLombardIssued: true,
    isYieldBearing: true,
    decimals: 8,
    addresses: { ...BTCE_VAULT_CONTRACTS } as Partial<Record<number, string>>,
    notes:
      "BTCe wraps the underlying Veda share (LBTCv) 1:1 today; convertToAssets() is the authoritative conversion if the ratio ever changes.",
  },
];

/**
 * Resolves a free-text query to a single LombardAsset, matching against
 * canonical symbol first, then aliases (case-insensitive). Returns undefined
 * if no match.
 */
export function resolveAssetByName(query: string): LombardAsset | undefined {
  if (!query) return undefined;
  const normalized = query.trim().toLowerCase();
  for (const asset of LOMBARD_ASSETS) {
    if (asset.symbol.toLowerCase() === normalized) return asset;
    if (asset.aliases.some((a) => a.toLowerCase() === normalized)) return asset;
  }
  return undefined;
}

/**
 * Resolves a contract address (case-insensitive) to a LombardAsset, scoped
 * to the given chainId. Only returns a hit when the address is in the
 * asset's pre-computed map; callers wanting to resolve arbitrary addresses
 * should fall back to getTokenContractInfo.
 */
export function resolveAssetByAddress(
  chainId: ChainId | number,
  address: string,
): LombardAsset | undefined {
  if (!address) return undefined;
  const target = address.toLowerCase();
  for (const asset of LOMBARD_ASSETS) {
    const onChain = asset.addresses[chainId as number];
    if (onChain && onChain.toLowerCase() === target) return asset;
  }
  return undefined;
}

/** Builds the markdown glossary that's appended to the system prompt. */
export function buildAssetGlossary(): string {
  const lines = LOMBARD_ASSETS.map((a) => {
    const tags = [
      a.isLombardIssued ? "Lombard-issued" : "third-party",
      a.isYieldBearing ? "yield-bearing" : "not yield-bearing",
    ].join(", ");
    return `- **${a.symbol}** (${a.name}; ${tags}; ${a.decimals} decimals) — ${a.description}`;
  });
  return [
    "# Lombard asset glossary",
    "",
    "These are the canonical Lombard-related assets. Use these names verbatim. If a user asks about an asset not listed here, call get_token_info to look it up before saying you don't know.",
    "",
    ...lines,
  ].join("\n");
}

/** Pre-built glossary string (computed once at module load). */
export const LOMBARD_ASSETS_GLOSSARY = buildAssetGlossary();
