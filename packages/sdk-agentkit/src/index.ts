/**
 * @lombard.finance/sdk-agentkit
 *
 * Lombard Action Provider for Coinbase AgentKit.
 *
 * Enables AI agents to interact with the Lombard protocol:
 * stake/unstake BTC.b/LBTC, deposit, redeem, and deploy to DeFi.
 *
 * @example
 * ```typescript
 * import { lombardActionProvider } from '@lombard.finance/sdk-agentkit';
 * import { AgentKit } from '@coinbase/agentkit';
 *
 * const agentkit = await AgentKit.from({
 *   walletProvider,
 *   actionProviders: [lombardActionProvider()],
 * });
 * ```
 *
 * @module index
 */

// Provider
export {
  LombardActionProvider,
  lombardActionProvider,
} from './lombardActionProvider';

// Schemas (for consumers who want to compose or extend)
export {
  DeploySchema,
  DepositSchema,
  RedeemSchema,
  StakeSchema,
  UnstakeSchema,
} from './schemas';

// Utilities
export { isNetworkSupported, toLombardChain } from './utils/chain-mapping';
export { toEIP1193Provider } from './utils/wallet-adapter';

// Constants
export {
  CHAIN_ID_TO_ENV,
  CHAIN_ID_TO_LOMBARD_CHAIN,
  CHAIN_ID_TO_NAME,
  SUPPORTED_CHAIN_IDS,
} from './constants';
