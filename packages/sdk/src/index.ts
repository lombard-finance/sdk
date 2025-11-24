// API functions:
export * from './api-functions';

// READ and WRITE functions:
export * from './contract-functions';

// Vault:
export * from './vaults';

// DeFi:
export * from './defi';

// Utils:
export * from './common/api-config';
export * from './common/blockchain-identifier';
export * from './common/chains';
export {
    SOLANA_DEVNET_CHAIN,
    SOLANA_MAINNET_CHAIN,
    SOLANA_TESTNET_CHAIN,
    SUI_DEVNET_CHAIN,
    SUI_MAINNET_CHAIN,
    SUI_TESTNET_CHAIN
} from './common/chains';
export * from './tokens/lbtc-addresses';
export * from './tokens/token-addresses';
export * from './utils/satoshi';

// Metrics:
export { getLBTCStats } from './metrics/get-lbtc-stats';

export {
    getAdditionalRewards,
    type RewardsDistribution
} from './metrics/get-additional-rewards';
export {
    getApy,
    getEstimatedApy,
    type LbtcApy,
    type LbtcEstimatedApy
} from './metrics/get-lbtc-apy';
export {
    getPositionsSummary,
    type PositionsSummary
} from './metrics/get-positions-summary';

// Tokens:
export * from './tokens/lbtc-addresses';
export * from './tokens/tokens';

// Re-exports:
export { Env } from '@lombard.finance/sdk-common';
export type { Address, EIP1193Provider } from 'viem';

// Signer support (custom transaction signing):
export {
    createAccountFromSigner,
    createWalletClientFromSigner, SignerError, validateTransactionRequest,
    type DispatchCallback,
    type EvmTransactionRequest,
    type SignerAdapter
} from './clients/evm-signer-adapter';

export {
    isProviderFlow,
    isSignerFlow,
    type CommonSignerWriteParameters
} from './common/parameters';

// Bridge:
export {
    bridge,
    bridgeCCIP,
    bridgeOFT,
    getBridgeInfo, OFT_GAS_LIMIT,
    OFT_HI_GAS_LIMIT,
    OFT_HI_GAS_LIMIT_CHAINS, type BridgeCCIPParameters,
    type BridgeParameters
} from './bridge';

// Debug:
export * from './debug-api';
