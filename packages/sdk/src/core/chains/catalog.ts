/**
 * Chain Catalog
 *
 * Complete metadata for all chains.
 *
 * @module core/chains/catalog
 */

import { Chain, ChainMetadata } from './types';

/**
 * Chain catalog with metadata for all chains.
 * TypeScript will error if any Chain is missing.
 */
export const CHAIN_CATALOG: Record<Chain, ChainMetadata> = {
  // ─────────────────────────────────────────────────────────────────────────
  // Bitcoin
  // ─────────────────────────────────────────────────────────────────────────
  [Chain.BITCOIN_MAINNET]: {
    name: 'Bitcoin',
    type: 'bitcoin',
    isTestnet: false,
    explorerUrl: 'https://mempool.space',
    nativeCurrency: 'BTC',
    badgeVariant: 'warning',
  },
  [Chain.BITCOIN_SIGNET]: {
    name: 'Bitcoin Signet',
    type: 'bitcoin',
    isTestnet: true,
    explorerUrl: 'https://mempool.space/signet',
    nativeCurrency: 'BTC',
    badgeVariant: 'warning',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EVM Mainnets
  // ─────────────────────────────────────────────────────────────────────────
  [Chain.ETHEREUM]: {
    name: 'Ethereum',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: 'ETH',
    badgeVariant: 'info',
  },
  [Chain.BASE]: {
    name: 'Base',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://basescan.org',
    nativeCurrency: 'ETH',
    badgeVariant: 'info',
  },
  [Chain.OPTIMISM]: {
    name: 'Optimism',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://optimistic.etherscan.io',
    nativeCurrency: 'ETH',
    badgeVariant: 'info',
  },
  [Chain.POLYGON]: {
    name: 'Polygon',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: 'MATIC',
    badgeVariant: 'info',
  },
  [Chain.BSC]: {
    name: 'BNB Chain',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: 'BNB',
    badgeVariant: 'info',
  },
  [Chain.AVALANCHE]: {
    name: 'Avalanche',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://snowtrace.io',
    nativeCurrency: 'AVAX',
    badgeVariant: 'info',
  },
  [Chain.BERACHAIN]: {
    name: 'Berachain',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://beratrail.io',
    nativeCurrency: 'BERA',
    badgeVariant: 'info',
  },
  [Chain.BOB]: {
    name: 'BOB',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://explorer.gobob.xyz',
    nativeCurrency: 'ETH',
    badgeVariant: 'info',
  },
  [Chain.ETHERLINK]: {
    name: 'Etherlink',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://explorer.etherlink.com',
    nativeCurrency: 'XTZ',
    badgeVariant: 'info',
  },
  [Chain.KATANA]: {
    name: 'Katana',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://explorer.katanarpc.com',
    nativeCurrency: 'BTC.b',
    badgeVariant: 'info',
  },
  [Chain.MORPH]: {
    name: 'Morph',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://explorer.morphl2.io',
    nativeCurrency: 'ETH',
    badgeVariant: 'info',
  },
  [Chain.SONIC]: {
    name: 'Sonic',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://sonicscan.org',
    nativeCurrency: 'S',
    badgeVariant: 'info',
  },
  [Chain.TAC]: {
    name: 'TAC',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://explorer.tac.build',
    nativeCurrency: 'TAC',
    badgeVariant: 'info',
  },
  [Chain.MEGAETH]: {
    name: 'MegaETH',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://megaeth.blockscout.com',
    nativeCurrency: 'ETH',
    badgeVariant: 'info',
  },
  [Chain.MONAD]: {
    name: 'Monad',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://monadvision.com',
    nativeCurrency: 'MONAD',
    badgeVariant: 'info',
  },
  [Chain.STABLE]: {
    name: 'Stable',
    type: 'evm',
    isTestnet: false,
    explorerUrl: 'https://stablescan.xyz',
    nativeCurrency: 'USD',
    badgeVariant: 'info',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EVM Testnets
  // ─────────────────────────────────────────────────────────────────────────
  [Chain.BASE_SEPOLIA]: {
    name: 'Base Sepolia',
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: 'ETH',
    badgeVariant: 'secondary',
  },
  [Chain.BSC_TESTNET]: {
    name: 'BNB Testnet',
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://testnet.bscscan.com',
    nativeCurrency: 'BNB',
    badgeVariant: 'secondary',
  },
  [Chain.AVALANCHE_FUJI]: {
    name: 'Avalanche Fuji',
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://testnet.snowtrace.io',
    nativeCurrency: 'AVAX',
    badgeVariant: 'secondary',
  },
  [Chain.BERACHAIN_BARTIO]: {
    name: 'Berachain Bartio',
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://bartio.beratrail.io',
    nativeCurrency: 'BERA',
    badgeVariant: 'secondary',
  },
  // Note: SONIC_TESTNET and SONIC_BLAZE_TESTNET are the same chain (eip155:57054)
  [Chain.SONIC_TESTNET]: {
    name: 'Sonic Blaze Testnet',
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://testnet.sonicscan.org',
    nativeCurrency: 'S',
    badgeVariant: 'secondary',
  },
  [Chain.SEPOLIA]: {
    name: 'Sepolia',
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: 'ETH',
    badgeVariant: 'secondary',
  },
  [Chain.HOLESKY]: {
    name: 'Holesky',
    type: 'evm',
    isTestnet: true,
    explorerUrl: 'https://holesky.etherscan.io',
    nativeCurrency: 'ETH',
    badgeVariant: 'secondary',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Solana
  // ─────────────────────────────────────────────────────────────────────────
  [Chain.SOLANA_MAINNET]: {
    name: 'Solana',
    type: 'solana',
    isTestnet: false,
    explorerUrl: 'https://solscan.io',
    nativeCurrency: 'SOL',
    badgeVariant: 'success',
  },
  [Chain.SOLANA_DEVNET]: {
    name: 'Solana Devnet',
    type: 'solana',
    isTestnet: true,
    explorerUrl: 'https://solscan.io?cluster=devnet',
    nativeCurrency: 'SOL',
    badgeVariant: 'secondary',
  },
  [Chain.SOLANA_TESTNET]: {
    name: 'Solana Testnet',
    type: 'solana',
    isTestnet: true,
    explorerUrl: 'https://solscan.io?cluster=testnet',
    nativeCurrency: 'SOL',
    badgeVariant: 'secondary',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Sui
  // ─────────────────────────────────────────────────────────────────────────
  [Chain.SUI_MAINNET]: {
    name: 'Sui',
    type: 'sui',
    isTestnet: false,
    explorerUrl: 'https://suiscan.xyz',
    nativeCurrency: 'SUI',
    badgeVariant: 'info',
  },
  [Chain.SUI_TESTNET]: {
    name: 'Sui Testnet',
    type: 'sui',
    isTestnet: true,
    explorerUrl: 'https://suiscan.xyz/testnet',
    nativeCurrency: 'SUI',
    badgeVariant: 'secondary',
  },
  [Chain.SUI_DEVNET]: {
    name: 'Sui Devnet',
    type: 'sui',
    isTestnet: true,
    explorerUrl: 'https://suiscan.xyz/devnet',
    nativeCurrency: 'SUI',
    badgeVariant: 'secondary',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Starknet
  // ─────────────────────────────────────────────────────────────────────────
  [Chain.STARKNET_MAINNET]: {
    name: 'Starknet',
    type: 'starknet',
    isTestnet: false,
    explorerUrl: 'https://starkscan.co',
    nativeCurrency: 'ETH',
    badgeVariant: 'info',
  },
  [Chain.STARKNET_SEPOLIA]: {
    name: 'Starknet Sepolia',
    type: 'starknet',
    isTestnet: true,
    explorerUrl: 'https://sepolia.starkscan.co',
    nativeCurrency: 'ETH',
    badgeVariant: 'secondary',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Zcash
  // ─────────────────────────────────────────────────────────────────────────
  [Chain.ZCASH_MAINNET]: {
    name: 'Zcash',
    type: 'zcash',
    isTestnet: false,
    explorerUrl: 'https://zcashblockexplorer.com',
    nativeCurrency: 'ZEC',
    badgeVariant: 'warning',
  },
  [Chain.ZCASH_TESTNET]: {
    name: 'Zcash Testnet',
    type: 'zcash',
    isTestnet: true,
    nativeCurrency: 'ZEC',
    badgeVariant: 'secondary',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Ripple
  // ─────────────────────────────────────────────────────────────────────────
  [Chain.RIPPLE_MAINNET]: {
    name: 'XRP Ledger',
    type: 'ripple',
    isTestnet: false,
    explorerUrl: 'https://xrpscan.com',
    nativeCurrency: 'XRP',
    badgeVariant: 'secondary',
  },
  [Chain.RIPPLE_TESTNET]: {
    name: 'XRP Testnet',
    type: 'ripple',
    isTestnet: true,
    nativeCurrency: 'XRP',
    badgeVariant: 'secondary',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Dogecoin
  // ─────────────────────────────────────────────────────────────────────────
  [Chain.DOGECOIN_MAINNET]: {
    name: 'Dogecoin',
    type: 'dogecoin',
    isTestnet: false,
    explorerUrl: 'https://dogechain.info',
    nativeCurrency: 'DOGE',
    badgeVariant: 'warning',
  },
  [Chain.DOGECOIN_TESTNET]: {
    name: 'Dogecoin Testnet',
    type: 'dogecoin',
    isTestnet: true,
    nativeCurrency: 'DOGE',
    badgeVariant: 'secondary',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Other
  // ─────────────────────────────────────────────────────────────────────────
  [Chain.HYPERLIQUID]: {
    name: 'Hyperliquid',
    type: 'hyperliquid',
    isTestnet: false,
    nativeCurrency: 'USDC',
    badgeVariant: 'secondary',
  },
};
