/**
 * EVM chain types and actions
 *
 * Import from '@lombard.finance/sdk/evm' for EVM-specific functionality.
 */

// EVM chain actions
export { EvmActions, evmActions } from '../chains/evm/EvmActions';

// Shared EVM utilities (fee authorization)
export type { FeeAuthState } from '../chains/evm/shared/feeAuth';

// EVM types and direct actions
export type {
  EvmDeployParams,
  EvmDeployPrepareParams,
  EvmDeployProgress,
  EvmDepositParams,
  EvmDepositPrepareParams,
  EvmDepositProgress,
  EvmRedeemParams,
  EvmRedeemPrepareParams,
  EvmRedeemProgress,
  EvmStakeParams,
  EvmStakePrepareParams,
  EvmStakeProgress,
  EvmUnstakeParams,
  EvmUnstakePrepareParams,
  EvmUnstakeProgress,
  // Withdraw and cancel-withdraw were exported from the root entry but never
  // from here, so `@lombard.finance/sdk/evm` could not reach any of them even
  // though `evm.withdraw()` is public. Found by the export-name snapshot.
  EvmWithdrawParams,
  EvmWithdrawPrepareParams,
  EvmWithdrawProgress,
  IEvmCancelWithdraw,
  IEvmDeploy,
  IEvmDeposit,
  IEvmRedeem,
  IEvmStake,
  IEvmUnstake,
  IEvmWithdraw,
} from '../chains/evm';
export {
  EvmDeployStatus,
  EvmDepositStatus,
  EvmRedeemStatus,
  EvmStakeStatus,
  EvmUnstakeStatus,
  EvmWithdrawStatus,
} from '../chains/evm';

// EVM status
export { EvmOperationStatus } from '../shared/constants/statusConstants';

// EVM module
export type {
  FeeAuthorizationResult,
  StoredFeeSignature,
} from '../modules/evmModule';
export { evmModule, type EvmService } from '../modules/evmModule';

// EVM signer support
export {
  createAccountFromSigner,
  createWalletClientFromSigner,
  type DispatchCallback,
  type EvmTransactionRequest,
  type SignerAdapter,
  SignerError,
  validateTransactionRequest,
} from '../clients/evm-signer-adapter';

// EVM chain utilities
export {
  addChain,
  type AddChainParameters,
  allChains,
  bob,
  bobSepolia,
  CHAIN_ID_TO_LLAMA_CHAIN_NAME_MAP,
  CHAIN_ID_TO_VIEM_CHAIN_MAP,
  ChainId,
  getChain,
  getLlamaChainName,
  isEthereumChain,
  isKatanaChain,
  isMegaethChain,
  isMonadChain,
  isStableChain,
  isValidChain,
  katana,
  megaeth,
  monad,
  RETIRED_CHAIN_IDS,
  type RetiredChainId,
  stable,
  tac,
} from '../common/chains';

// Fee requirements
export {
  AUTO_MINT_FEE_CHAINS,
  requiresAutoMintFee,
} from '../common/fee-requirements';

// EVM token addresses
export {
  EVM_LBTC_ADDRESSES,
  getTokenAddressForChain,
  getTokenByAddress,
  TOKEN_ADDRESSES,
} from '../tokens/token-addresses';
