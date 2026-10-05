import { getLegacyChainNameById } from '../../common/blockchain-identifier';
import type { ChainId } from '../../common/chains';

const LEGACY_PREFIX = 'BLOCKCHAIN_';

/**
 * The lowercase chain name the stake-and-bake permit routes take in `?chain=`
 * (`ethereum`, `base`, `bsc`, ...).
 *
 * Derived from the `BLOCKCHAIN_*` identifier, so a testnet answers to its
 * mainnet name exactly as on the deposit-address route: sepolia is `ethereum`.
 * The environment picks the network, not the name.
 *
 * @throws if the chain has no identifier.
 */
export function getStakeAndBakeApiChainName(chainId: ChainId): string {
  const legacy = getLegacyChainNameById(chainId);
  return legacy.startsWith(LEGACY_PREFIX)
    ? legacy.slice(LEGACY_PREFIX.length).toLowerCase()
    : legacy.toLowerCase();
}
