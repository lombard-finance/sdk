/**
 * Lombard SDK - Public API
 *
 * Main entry point for the Lombard SDK.
 */

// Environment - exported from sdk-common for type consistency
export { Env } from '@lombard.finance/sdk-common';

// SDK Version (injected at build time)
export { SDK_NAME, SDK_RUNTIME, SDK_VERSION } from './version';

// Common constants
export {
  MIN_REDEEM_AMOUNT_BTC,
  MIN_STAKE_AMOUNT_BTC,
} from './common/constants';

// Logging utilities
export {
  type ConsoleLoggerOptions,
  createConsoleLogger,
  createSilentLogger,
  type LogLevel,
} from './utils/consoleLogger';

// HTTP utilities (for advanced users)
export { getSdkHeaders } from './utils/http';

// Main SDK exports
export type {
  ApiVersion,
  DepositAddressOptions,
  DestinationChain,
  ExchangeRateOptions,
  VaultWithdrawalsOptions,
  WithdrawalOptions,
} from './client/ApiNamespace';
export { ApiNamespace } from './client/ApiNamespace';
// EarnWithdrawal, EarnWithdrawals exported via './vaults'
export { createConfig } from './client/createConfig';
export { createLombardSDK } from './client/createLombardSDK';
export { LombardSDK } from './client/LombardSDK';
export { PartnerConfiguration } from './client/PartnerConfiguration';

// Chain Actions (user-facing API)
export { BtcActions, btcActions } from './chains/btc/BtcActions';
export { EvmActions, evmActions } from './chains/evm/EvmActions';
export { SolanaActions, solanaActions } from './chains/solana/SolanaActions';
export {
  StarknetActions,
  starknetActions,
} from './chains/starknet/StarknetActions';
export { SuiActions, suiActions } from './chains/sui/SuiActions';

// Shared EVM utilities (fee authorization)
export type { FeeAuthState } from './chains/evm/shared/feeAuth';

// Status constants (single export to avoid duplicates)
export {
  BtcActionStatus,
  EvmOperationStatus,
  NonEvmOperationStatus,
} from './shared/constants/statusConstants';

// Module exports
export { btcModule, type BtcService } from './modules/btcModule';
export type {
  FeeAuthorizationResult,
  StoredFeeSignature,
} from './modules/evmModule';
export { evmModule, type EvmService } from './modules/evmModule';
export type {
  PollWalletVerificationRequest,
  RevokeWalletTokenRequest,
  WalletAuthChain,
  WalletChallengeRequest,
  WalletChallengeResponse,
  WalletVerifyRequest,
  WalletVerifyResponse,
  WalletVerifyResult,
} from './modules/walletAuthModule';
export {
  VERIFICATION_STATUS,
  walletAuthModule,
  WalletAuthService,
} from './modules/walletAuthModule';

// Low-level wallet-auth API functions
export {
  pollWalletVerification,
  type PollWalletVerificationParams,
  requestWalletChallenge,
  type RequestWalletChallengeParams,
  revokeWalletToken,
  type RevokeWalletTokenParams,
  verifyWalletSignature,
  type VerifyWalletSignatureParams,
} from './api-functions/walletAuth';

// Wallet-auth challenge types, re-exported so callers naming a challenge type
// do not have to depend on sdk-common directly.
export {
  type FeeApprovalChallengeParams,
  type PermitChallengeParams,
  WALLET_CHALLENGE_TYPE,
  type WalletChallengeType,
} from '@lombard.finance/sdk-common';

// Raised when a wallet already holds an active stake-and-bake signature, so a
// permit challenge would be refused; callers fall back to the plain challenge.
export { ActivePermitExistsError } from './utils/err';

// One-call permit authorisation: sign a server-issued permit, get a JWT.
export {
  type ISignPermitChallengeParams,
  type ISignPermitChallengeResult,
  signPermitChallenge,
} from './contract-functions/signPermitChallenge';

// Context types
export type {
  BtcCoreContext,
  CoreContext,
  EvmCoreContext,
  EvmDestination,
  Logger,
  ProviderKey,
  ProviderResolver,
  SolanaDestination,
  StarknetDestination,
  SuiDestination,
} from './shared/context';

// Configuration types
export type {
  CreateConfigOptions,
  CustomAsset,
  LombardConfig,
  LombardSDKOptions,
  PartnerConfig,
  ProviderGetter,
  ProviderGetters,
} from './config/types';

// Provider types
export type {
  AnyProvider,
  BtcProvider,
  EvmProvider,
  SolanaProvider,
  StarknetProvider,
  SuiProvider,
} from './config/providers';
export {
  isBtcProvider,
  isEvmProvider,
  isSolanaProvider,
  isStarknetProvider,
  isSuiProvider,
} from './config/providers';

// Shared types
export type {
  ChainMetadata,
  DeployConfig,
  RouteParams,
  StrategyProgress,
} from './core';
export {
  AssetId,
  assetValueToKey,
  Chain,
  // Chain utility functions
  CHAIN_CATALOG,
  chainValueToKey,
  DeployProtocol,
  evmChainIdToChain,
  getAllAssetChains,
  getAssetAddress,
  // Asset utility functions for dynamic chain discovery
  getAssetChains,
  getAssetChainsForEnvs,
  getChainMetadata,
  getChainName,
  getExplorerTxUrl,
  isAssetDeployed,
  isAssetId,
  isChain,
  isEvmChain,
  isMainnet,
  isRetiredChain,
  isTestnet,
  RETIRED_CHAINS,
  StepStatus,
  StrategyStatus,
} from './core';

// Event types
export type {
  ActionEventMap,
  BridgeEventMap,
  DeployEventMap,
  DepositEventMap,
  RedeemEventMap,
  StakeEventMap,
  StrategyEvent,
  StrategyEventHandlerMap,
  StrategyEventMap,
  UnstakeEventMap,
  WithdrawEventMap,
} from './shared/events';
export {
  ActionEvent,
  BridgeEvent,
  DeployEvent,
  DepositEvent,
  RedeemEvent,
  StakeEvent,
  UnstakeEvent,
  WithdrawEvent,
} from './shared/events';

// Error handling
export {
  ContractErrorCode,
  ErrorCode,
  isLombardError,
  LombardError,
  ProviderErrorCode,
  RegistryErrorCode,
  ValidationErrorCode,
  wrapError,
} from './shared/errors';

// Action interfaces
export type { LogMeta, MonitorableAction } from './shared/actions/BaseAction';

// BTC types and direct actions
export type {
  BtcDepositAndDeployParams,
  BtcDepositAndDeployPrepareParams,
  BtcDepositAndDeployProgress,
  BtcDepositParams,
  BtcDepositPrepareParams,
  BtcDepositProgress,
  BtcStakeAndDeployParams,
  BtcStakeAndDeployPrepareParams,
  BtcStakeAndDeployProgress,
  BtcStakeParams,
  BtcStakeProgress,
  IBtcDeposit,
  IBtcDepositAndDeploy,
  IBtcStake,
  IBtcStakeAndDeploy,
} from './chains/btc';
export {
  BtcDeposit,
  BtcDepositAndDeploy,
  BtcStake,
  BtcStakeAndDeploy,
} from './chains/btc';

// Note: Sync factory functions are intentionally not exported. Use
// createLombardSDK() instead:
//
//   const sdk = await createLombardSDK({ env: Env.prod, ... });
//   const deposit = sdk.chain.btc.deposit({ assetOut: AssetId.LBTC, ... });
//
// This ensures consistent behavior when remote catalog fetching is added.

// EVM types and direct actions
export type {
  EvmCancelWithdrawParams,
  EvmCancelWithdrawProgress,
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
} from './chains/evm';
export {
  EvmDeployStatus,
  EvmDepositStatus,
  EvmRedeemStatus,
  EvmStakeStatus,
  EvmUnstakeStatus,
  EvmWithdrawStatus,
} from './chains/evm';

// Note: Sync factory functions are intentionally
// not exported. Use createLombardSDK() instead:
//
//   const sdk = await createLombardSDK({ env: Env.prod, ... });
//   const unstake = sdk.chain.evm.unstake({ ... });

// Utils - API Config:
export { getApiConfig, type IApiConfig } from './common/api-config';

// Utils - Blockchain Identifier:
export {
  BlockchainIdentifier,
  getBaseNetworkByEnv,
  getBscNetworkByEnv,
  getChainIdByName,
  getChainNameById,
  getEthNetworkByEnv,
  getLegacyChainNameById,
  getSolanaNetworkByEnv,
  getSonicNetworkByEnv,
  getStarknetNetworkByEnv,
  getSuiNetworkByEnv,
} from './common/blockchain-identifier';

// Utils - Chains:
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
  isSolanaChain,
  isStableChain,
  isStarknetChainId,
  isSuiChain,
  isValidChain,
  katana,
  megaeth,
  monad,
  RETIRED_CHAIN_IDS,
  type RetiredChainId,
  SOLANA_DEVNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
  type SolanaChain,
  stable,
  STARKNET_MAINNET_CHAIN,
  STARKNET_SEPOLIA_CHAIN,
  type StarknetChainId,
  SUI_DEVNET_CHAIN,
  SUI_LOCALNET_CHAIN,
  SUI_MAINNET_CHAIN,
  SUI_TESTNET_CHAIN,
  type SuiChain,
  tac,
} from './common/chains';

// Utils - Fee Requirements:
export {
  AUTO_MINT_FEE_CHAINS,
  requiresAutoMintFee,
} from './common/fee-requirements';

// Token utilities - LBTC Addresses:
export { getLbtcContractAddresses } from './tokens/lbtc-addresses';

// Token utilities - Token Addresses:
export {
  AddressKind,
  EVM_LBTC_ADDRESSES,
  getSolanaTokenAddress,
  getStarknetTokenAddress,
  getSuiTokenAddress,
  getTokenAddressForChain,
  getTokenByAddress,
  RATIO_TOKEN_MAP,
  type RatioToken,
  SOLANA_TOKEN_ADDRESSES,
  STARKNET_ASSET_ROUTER_ADDRESSES,
  STARKNET_TOKEN_ADDRESSES,
  SUI_TOKEN_ADDRESSES,
  Token,
  TOKEN_ADDRESSES,
  type TokenAddresses,
  type TokenAddressesPerEnv,
} from './tokens/token-addresses';
export type { BridgeTokenAddresses } from './tokens/types';

// Token utilities - Token Operations:
export {
  fromBaseDenomination,
  getTokenContractInfo,
  isUpgradedAbi,
  retrieveTokenProperties,
  toBaseDenomination,
  type TokenInfo,
} from './tokens/tokens';

// Utils - Satoshi:
export {
  BTC_DECIMALS,
  fromSatoshi,
  SATOSHI_SCALE,
  toSatoshi,
  toSatoshiBigInt,
} from './utils/satoshi';

// DeFi registry
export {
  DEFI_REGISTRY,
  DefiProtocol,
  DefiProtocols,
  type DefiRegistryToken,
  EARN_STAKE_AND_BAKE_CHAINS,
  type EarnStakeAndBakeChain,
  getAvailableProtocols,
  getAvailableProtocolsWithMetadata,
  getStakeAndBakeSupportedChains,
  getSupportedProtocols,
  isEarnStakeAndBakeChain,
  type StakeAndBakeRegistry,
  type StakeAndBakeToken,
} from './defi';

// Metrics:
export {
  getAdditionalRewards,
  type RewardsDistribution,
} from './metrics/get-additional-rewards';
export {
  getApy,
  getEstimatedApy,
  type LbtcApy,
  type LbtcEstimatedApy,
} from './metrics/get-lbtc-apy';
export { getLBTCStats } from './metrics/get-lbtc-stats';
export {
  getPositionsSummary,
  type PositionsSummary,
} from './metrics/get-positions-summary';

// Referrals
export { ReferralsClient } from './referrals';
export type {
  ReferralLookupParams,
  ReferralLookupResult,
} from './referrals/ReferralsClient';

// API response types
export type { Deposit } from './api-functions/getDepositsByAddress/getDepositsByAddress';
export type { Unstake } from './api-functions/getUnstakesByAddress/getUnstakesByAddress';
export { PayoutTxStatus } from './api-functions/getUnstakesByAddress/getUnstakesByAddress';

// Deposit status utilities
export {
  calcConfirmations,
  type ConfirmationProgress,
  depositRequiresAction,
  type DepositStatus,
  type DepositStatusDisplay,
  getConfirmationProgress,
  getDepositStatus,
  getDepositStatusDisplay,
  isDepositClaimable,
  isDepositPending,
  isDepositTerminal,
  MIN_CLAIM_AMOUNT_BTC,
  REQUIRED_CONFIRMATIONS,
  type StatusSeverity,
} from './shared/deposits';

// External types
export type { Address, EIP1193Provider } from 'viem';

// API functions:
export {
  generateDepositBtcAddress,
  type IGenerateDepositBtcAddressParams,
  SANCTIONED_ADDRESS,
} from './api-functions/generateDepositBtcAddress/generateDepositBtcAddress';
export {
  getDepositBtcAddress,
  getDepositBtcAddresses,
} from './api-functions/getDepositBtcAddress/getDepositBtcAddress';
export type {
  IApiError,
  IDepositAddress,
  IDepositAddressesResponse,
  IGetDepositBtcAddressesParameters,
  IGetDepositBtcAddressParameters,
} from './api-functions/getDepositBtcAddress/types';
export {
  type DirectDeposit,
  type DirectDepositsResponse,
  ENotarizationStatus,
  ESessionState,
  fetchBTCbDeposits,
  fetchDirectDeposits,
  getDepositsByAddress,
  type IGetDepositsByAddressParams,
  type NativeDeposit,
  type NativeDepositsResponse,
} from './api-functions/getDepositsByAddress/getDepositsByAddress';
export { getExchangeRatio } from './api-functions/getLBTCExchangeRate/get-exchange-ratio';
export {
  getLBTCExchangeRate,
  type IgetLBTCExchangeRateParams,
  type IgetLBTCExchangeRateResponse,
} from './api-functions/getLBTCExchangeRate/getLBTCExchangeRate';
export {
  getNetworkFeeSignature,
  type IGetNetworkFeeSignatureMappedResponse,
  type IGetNetworkFeeSignatureParams,
} from './api-functions/getNetworkFeeSignature/getNetworkFeeSignature';
export {
  getLuxSeason1Points,
  getLuxSeason2Points,
  getPointsByAddress,
  type IGetPointsByAddressParameters,
  type IPointsBase,
  type IPointsByAddressSeason1,
  type IPointsByAddressSeason2,
  type IProtocolPointsBreakdown,
} from './api-functions/getPointsByAddress/getPointsByAddress';
export {
  fetchUnstakesByAddress,
  getUnstakesByAddress,
  type IGetUnstakesByAddressParameters,
} from './api-functions/getUnstakesByAddress/getUnstakesByAddress';
export {
  getUserStakeAndBakeSignature,
  type IGetUserStakeAndBakeSignatureParams,
  type IGetUserStakeAndBakeSignatureResponse,
} from './api-functions/getUserStakeAndBakeSignature/getUserStakeAndBakeSignature';
export {
  canResolveDepositBtcAddressWithJwt,
  getDepositAssetTypeById,
  type IResolveDepositBtcAddressParams,
  resolveDepositBtcAddress,
} from './api-functions/resolveDepositBtcAddress/resolveDepositBtcAddress';
export {
  type ISetReferralParams,
  setReferral,
} from './api-functions/setReferral/setReferral';
export {
  FeeSignatureAlreadyExistsError,
  type IStoreNetworkFeeSignatureParams,
  type IStoreNetworkFeeSignatureStatus,
  storeNetworkFeeSignature,
} from './api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature';
export {
  type IStoreStakeAndBakeSignatureParams,
  type IStoreStakeAndBakeSignatureStatus,
  storeStakeAndBakeSignature,
} from './api-functions/storeStakeAndBakeSignature/storeStakeAndBakeSignature';

// Contract functions - READ:
export {
  BasculeDepositStatus,
  getBasculeDepositStatus,
  type IGetBasculeDepositStatusParameters,
} from './contract-functions/getBasculeDepositStatus/getBasculeDepositStatus';
export {
  getLBTCBurningFee,
  getLBTCMintingFee,
  getMinRedeemAmount,
  getMinRedeemAmountWithFee,
  getMintingFee,
  getRedeemFee,
} from './contract-functions/getLBTCMintingFee/getLBTCMintingFee';
export { getLBTCTotalSupply } from './contract-functions/getLBTCTotalSupply/getLBTCTotalSupply';
export {
  getPermitNonce,
  type IGetPermitNonceParams,
} from './contract-functions/getPermitNonce/getPermitNonce';
export {
  getStakeAndBakeFee,
  type IGetStakeAndBakeFeeParams,
} from './contract-functions/getStakeAndBakeFee/getStakeAndBakeFee';

// Contract functions - WRITE:
export {
  approveLBTC,
  type IApproveLBTCParams,
} from './contract-functions/approveLBTC/approveLBTC';
export {
  approveToken,
  getTokenAllowance,
  type IApproveTokenParams,
} from './contract-functions/approveToken/approveToken';
export {
  claimLBTC,
  type IClaimLBTCParams,
  mintToken,
} from './contract-functions/claimLBTC/claimLBTC';
export {
  claimUnstakeRedeem,
  type IClaimUnstakeRedeemParams,
} from './contract-functions/claimUnstakeRedeem/claimUnstakeRedeem';
export {
  depositToken,
  getAssetRouterAddress,
} from './contract-functions/deposit/depositToken';
export {
  getAddressConfirmationMessage,
  signLbtcDestinationAddr,
  type SignLbtcDestinationAddrParams,
} from './contract-functions/signLbtcDestionationAddr/signLbtcDestinationAddr';
export {
  type ISignNetworkFeeParams,
  type ISignNetworkFeeResponse,
  signNetworkFee,
} from './contract-functions/signNetworkFee/signNetworkFee';
export {
  type ISignStakeAndBakeParams,
  type ISignStakeAndBakeResult,
  signStakeAndBake,
} from './contract-functions/signStakeAndBake/signStakeAndBake';
export { getStakeAndBakeConfig } from './contract-functions/signStakeAndBake/validation';
export {
  type IUnstakeLBTCParams,
  redeemToken,
  unstakeLBTC,
} from './contract-functions/unstakeLBTC/unstakeLBTC';

// Contract functions - VAULT READ:
export {
  getBtceShares,
  type IGetBtceSharesParameters,
} from './contract-functions/getBtceShares/getBtceShares';
export {
  getEarnPosition,
  type IGetEarnPositionParameters,
  type IGetEarnPositionResponse,
} from './contract-functions/getEarnPosition/getEarnPosition';

// Contract functions - VAULT WRITE:
export {
  cancelEarnWithdrawal,
  type CancelEarnWithdrawalParameters,
} from './contract-functions/cancelEarnWithdrawal/cancelEarnWithdrawal';
export {
  depositEarn,
  type DepositEarnParameters,
} from './contract-functions/depositEarn/depositEarn';
export {
  previewWithdrawEarn,
  type PreviewWithdrawEarnParameters,
  type PreviewWithdrawEarnResult,
} from './contract-functions/previewWithdrawEarn/previewWithdrawEarn';
export {
  unwrapBtceToLbtcv,
  type UnwrapBtceToLbtcvParameters,
} from './contract-functions/unwrapBtceToLbtcv/unwrapBtceToLbtcv';
export {
  withdrawEarn,
  type WithdrawEarnParameters,
  type WithdrawEarnResult,
} from './contract-functions/withdrawEarn/withdrawEarn';
export {
  wrapToBtce,
  type WrapToBtceParameters,
} from './contract-functions/wrapToBtce/wrapToBtce';

// Vault:
// Note: `cancelWithdraw`, `deposit`, `queueWithdraw` and their parameter types
// were removed in 5.0.0. Use `cancelEarnWithdrawal`, `depositEarn`, and
// `withdrawEarn` from the contract-functions exports above.
export {
  BTCE_VAULT_CHAINS,
  BTCE_VAULT_CONTRACTS,
  type BtceVaultChain,
  type EarnDeposit,
  type EarnWithdrawal,
  type EarnWithdrawals,
  getEarnApy,
  type GetEarnApyParameters,
  getEarnDeposits,
  getEarnDepositsAllChains,
  type GetEarnDepositsAllChainsParameters,
  type GetEarnDepositsParameters,
  getEarnPoints,
  type GetEarnPointsParameters,
  getEarnTVL,
  type GetEarnTVLParameters,
  getEarnWithdrawals,
  getEarnWithdrawalsAllChains,
  type GetEarnWithdrawalsAllChainsParameters,
  type GetEarnWithdrawalsParameters,
  isBtceVaultChain,
} from './vaults';

// Signer support (custom transaction signing):
export {
  createAccountFromSigner,
  createWalletClientFromSigner,
  type DispatchCallback,
  type EvmTransactionRequest,
  type SignerAdapter,
  SignerError,
  validateTransactionRequest,
} from './clients/evm-signer-adapter';

// RPC URL configuration (for wagmi/viem setup):
export {
  getRpcUrlConfig,
  RPC_URL,
  rpcUrlConfig,
  type TRpcUrlConfig,
} from './clients/rpc-url-config';
export {
  type CommonSignerWriteParameters,
  isProviderFlow,
  isSignerFlow,
} from './common/parameters';

// Bridge:
export {
  bridge,
  bridgeCCIP,
  type BridgeCCIPParameters,
  bridgeOFT,
  type BridgeParameters,
  getBridgeInfo,
  OFT_GAS_LIMIT,
  OFT_HI_GAS_LIMIT,
  OFT_HI_GAS_LIMIT_CHAINS,
} from './bridge';

// Debug:
export { fetchBtcScriptToAddress } from './debug-api/btc-script-to-address';
export { fetchBtcTxInfo } from './debug-api/btc-tx-info';
export { fetchEvmByBtcAddress } from './debug-api/evm-by-btc-address';

// Internal utilities (used by apps/main):
export { makePublicClient } from './clients/public-client';
export {
  getErrorMessage,
  TokenContractAddressNotFoundError,
  UnsupportedTokenFlow,
} from './utils/err';
export { ensureHex, isHex } from './utils/hex';
export { DAY, HOUR, MINUTE, now, SECOND, toUnix } from './utils/time';

// ── The v6 action contract (§5 of the redesign) ──
//
// Exported from the root and from `./core` so a consumer can name a status, a
// step or a route without reaching into the package. Without this the whole
// contract compiles, is tested, and is unreachable — which is exactly what
// happened until the playground tried to import it.
export type {
  Action,
  ActionNamespace,
  ActionProgress,
  ActionResult,
  ActionStepKey,
  ActionSteps,
  ActionTxHashes,
  AuthorizationGroup,
  AuthorizationStatus,
  BitcoinSourceAction,
  BtcDeployStatus,
  BtcDepositStatus,
  CancellableAction,
  ClaimableAction,
  DeployAsset,
  DeployNamespace,
  DeployParams,
  DepositParams,
  EvmCancelWithdrawStatus,
  EvmClaimStatus,
  // EvmDeployStatus is deliberately absent. v5 already exports that name as an
  // alias of EvmOperationStatus, and the v6 narrowing describes the same concept
  // with a smaller member set. Exporting both is a duplicate identifier;
  // silently swapping the meaning would change what a consumer's type admits
  // with no error at their call site. It lands when the EVM classes adopt the
  // narrowings in stage D, as a named breaking change.
  EvmVaultWithdrawStatus,
  FeeAuthorizedAction,
  PrepareParams,
  ReachableActionStatus,
  RouteLabel,
  RouteLabelParams,
  ShareAmount,
  SolanaDepositStatus,
  SolanaWithdrawStatus,
  StarknetWithdrawStatus,
  SubmitProgress,
  SuiWithdrawStatus,
  TerminalStatus,
  WithdrawParams,
} from './core/actions';
export {
  ACTION_STEP_KEYS,
  ActionStatus,
  AUTHORIZATION_STATUSES,
  deriveRouteLabel,
  isAddressResult,
  isAuthorizationStatus,
  isTerminalStatus,
  isTxResult,
  REGISTRY_TOKEN_ROWS,
  resolveRegistryToken,
  shares,
  TERMINAL_STATUSES,
  vaultAsset,
} from './core/actions';

// ── The wallet-auth transport contract ──
//
// Re-exported from `sdk-common` so a consumer can type an `auth` provider
// without depending on `sdk-common` directly. `LombardConfig.auth` is typed as
// `LombardAuth`, so a consumer that cannot name the type cannot implement it.
export type {
  AuthRequestContext,
  LombardAuth,
  RequestScope,
} from '@lombard.finance/sdk-common';

// ── Wallet-auth chain names ──
//
// The auth routes name chains a fourth way (the short `/v2/chains` name), so
// this derives it rather than leaving each consumer to hand-write the table.
export {
  walletAuthChainName,
  walletAuthChainNames,
} from './common/wallet-auth-chain';

// The one-call sign-in ceremony and its parameter types.
export type {
  WalletSignInParams,
  WalletSignInResult,
  WalletSignResult,
} from '@lombard.finance/sdk-common';
