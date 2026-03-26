// Export types
export * from './types/network';
export * from './types/walletProviders';

// Export constants
export { getConfig, getLBTCAddress, getBTCBAddress } from './const/getConfig';
export * from './const/known-errors';
export * from './const/rpcUrls';

// Export utility functions
export { parseOFTRecipient } from './utils/bridgeUtils';
export { getLBTCProgramAddress } from './utils/getLBTCProgramAddress';

// Web3 SDK functions
export * from './web3Sdk';

// Bridge functions
export * from './bridge';

// Add these specific exports to make them easier to import
export { loadBridgeFunctions } from './bridge';
export { getOftAmountCanBeSent } from './bridge/getOftAmountCanBeSent';
export { claimLBTC } from './web3Sdk/claimLBTC/claimLBTC';

// Optional chain module (Service-First): used by the core SDK CapabilityRegistry.
// This MUST be exported from the package entrypoint so integrators can register:
//   createConfig({ modules: [solanaModule()], providers: { solana: () => window.solana } })
export { solanaModule } from './module/createSolanaModule';
