/**
 * Chain names for the wallet-auth routes
 *
 * `/v2/auth/wallet/{challenge,verify}` names chains a fourth way. The SDK
 * already speaks three vocabularies — viem chain ids, `DESTINATION_BLOCKCHAIN_*`
 * and the older `BLOCKCHAIN_*` (see {@link BlockchainIdentifier}) — and the auth
 * routes take none of them. They take the short `name` from `/v2/chains`:
 * `ethereum`, `base`, `solana`, `starknet`.
 *
 * ## Why this is worth deriving rather than passing through
 *
 * The name is load-bearing, and only on the second call. An EOA signature is
 * ECDSA and verifies off-chain, so any accepted name works. A smart-contract
 * wallet is verified through ERC-1271 *on the named chain*, so a Safe that
 * exists only on Base and is submitted as `ethereum` has no code at that
 * address on that chain and verification cannot ever succeed. The challenge call
 * that precedes it returns 200 either way, so the mistake surfaces one step
 * later as an opaque failure.
 *
 * ## Why there is no testnet variant
 *
 * The env already picks the host, and each host enumerates its own chains under
 * the same canonical name — testnet's `/v2/chains` lists `ethereum` with chain
 * id 11155111. Suffixed aliases (`ethereum_sepolia`, `base_sepolia`) are
 * accepted by the testnet host but rejected by mainnet, and the set of aliases
 * is not the set of chain slugs used elsewhere: `sonic` has no accepted testnet
 * alias at all, so a slug-derived `sonic_blaze` is rejected outright. Deriving
 * one unsuffixed name per chain family is therefore both simpler and the only
 * form that is correct on every env.
 *
 * @module common/wallet-auth-chain
 */

import {
  BlockchainIdentifier,
  getChainNameById,
} from './blockchain-identifier';
import { ChainId, SolanaChain, StarknetChainId, SuiChain } from './chains';

/**
 * The `/v2/chains` name for each chain family.
 *
 * Keyed by {@link BlockchainIdentifier} because that identifier already
 * collapses a family's testnets onto one entry — sepolia and holesky are both
 * `BLOCKCHAIN_ETHEREUM` — which is the same granularity the auth routes use.
 */
const WALLET_AUTH_CHAIN_NAME: Partial<Record<BlockchainIdentifier, string>> = {
  [BlockchainIdentifier.eth]: 'ethereum',
  [BlockchainIdentifier.base]: 'base',
  [BlockchainIdentifier.bsc]: 'bsc',
  [BlockchainIdentifier.avalanche]: 'avalanche',
  [BlockchainIdentifier.sonic]: 'sonic',
  [BlockchainIdentifier.katana]: 'katana',
  [BlockchainIdentifier.monad]: 'monad',
  [BlockchainIdentifier.megaeth]: 'megaeth',
  [BlockchainIdentifier.stable]: 'stable',
  [BlockchainIdentifier.solana]: 'solana',
  [BlockchainIdentifier.sui]: 'sui',
  [BlockchainIdentifier.starknet]: 'starknet',
};

/**
 * The `/v2/chains` name to send to the wallet-auth routes for a chain id.
 *
 * Pass the wallet's *actual* connected chain. For an EOA the choice does not
 * affect the outcome; for a smart-contract wallet it decides which chain the
 * ERC-1271 check runs against, and there is no safe default — hence a throw
 * rather than a fallback to Ethereum.
 *
 * Bitcoin needs no case here: it has no id in the chain-id vocabulary this
 * takes, so it cannot be passed in the first place. A BTC wallet authenticates
 * through its destination-chain wallet, and the gateway would answer
 * `unsupported chain for signature verification` either way.
 *
 * @throws if the chain has no wallet-auth name, or is not a chain the SDK knows.
 */
export function walletAuthChainName(
  chainId:
    | ChainId
    | SuiChain
    | SolanaChain
    | StarknetChainId
    // A plain number as well as the known ids: every EVM wallet reports its
    // chain as an unbranded `number`, and requiring the union would put a cast
    // at every call site — which defeats the point of deriving the name at all.
    // Unknown ids already throw, so nothing is lost by accepting one.
    | (number & {}),
): string {
  // Throws on its own for a chain id the SDK does not know at all, which is
  // what makes accepting a plain number safe: an id outside the known set never
  // reaches the table below.
  const family = getChainNameById(
    chainId as ChainId | SuiChain | SolanaChain | StarknetChainId,
  );

  const name = WALLET_AUTH_CHAIN_NAME[family];
  if (!name) {
    throw new Error(
      `No wallet-auth chain name for ${family}. Supported: ${Object.values(
        WALLET_AUTH_CHAIN_NAME,
      )
        .sort()
        .join(', ')}.`,
    );
  }

  return name;
}

/** Every name the wallet-auth routes accept, for diagnostics and tests. */
export function walletAuthChainNames(): readonly string[] {
  return Object.values(WALLET_AUTH_CHAIN_NAME).sort();
}
