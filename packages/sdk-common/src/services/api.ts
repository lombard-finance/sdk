/**
 * API Service
 *
 * Operations for Lombard backend API provided by apiModule() or built-in.
 * Used by actions for deposit address generation and tracking.
 */

/**
 * Destination chain ID (EVM numeric, Solana string, etc.)
 */
export type DestinationChainId = number | string;

/**
 * Deposit information returned from API
 */
export interface DepositInfo {
  depositAddress: string;
  blockHeight?: number;
  isClaimed: boolean;
  txid?: string;
  amount?: string;
}

/**
 * Parameters for generating a deposit address
 */
export interface GenerateDepositAddressParams {
  /** Recipient address on destination chain */
  address: string;
  /** Destination chain ID */
  chainId: DestinationChainId;
  /** Authorization signature */
  signature: string;
  /**
   * Token to mint (LBTC, BTCb, etc.)
   * REQUIRED - determines which token contract address is used
   */
  token: string;
  /** EIP-712 typed data (for EVM) */
  eip712Data?: string;
  /** Signature data (for stake and bake) */
  signatureData?: string;
  /** Public key (for non-EVM chains) */
  pubKey?: string;
  /** Partner ID for attribution */
  partnerId?: string;
  /** Referral code */
  referrerCode?: string;
  /** Captcha token */
  captchaToken?: string;
}

/**
 * Parameters for getting an existing deposit address
 */
export interface GetDepositAddressParams {
  address: string;
  chainId: DestinationChainId;
  /** Token to look up (LBTC, BTCb, etc.) - REQUIRED */
  token: string;
  partnerId?: string;
}

/**
 * Fee signature storage parameters
 */
export interface StoreFeeSignatureParams {
  address: string;
  signature: string;
  typedData: string;
  /** Token address to distinguish LBTC vs BTC.b signatures */
  tokenAddress?: string;
}

/**
 * Fee signature retrieval parameters
 */
export interface GetFeeSignatureParams {
  address: string;
  chainId: number;
  /** Token address to distinguish LBTC vs BTC.b signatures */
  tokenAddress?: string;
}

/**
 * Fee signature result
 */
export interface FeeSignatureResult {
  hasSignature: boolean;
  signature?: string;
  typedData?: string;
  expirationDate?: string;
}

/**
 * Stake and bake signature storage parameters
 */
export interface StoreStakeAndBakeParams {
  signature: string;
  typedData: string;
}

/**
 * API Service Interface
 *
 * Provides all Lombard backend API operations.
 * Injected into contexts as `ctx.api`.
 */
export interface ApiService {
  /**
   * Generate a new BTC deposit address
   */
  generateDepositAddress(params: GenerateDepositAddressParams): Promise<string>;

  /**
   * Get existing deposit address for a recipient
   * Returns undefined if no address exists
   */
  getDepositAddress(
    params: GetDepositAddressParams,
  ): Promise<string | undefined>;

  /**
   * Get deposits for an address
   */
  getDeposits(address: string): Promise<DepositInfo[]>;

  /**
   * Store network fee signature
   */
  storeFeeSignature(params: StoreFeeSignatureParams): Promise<void>;

  /**
   * Get stored network fee signature
   */
  getFeeSignature(params: GetFeeSignatureParams): Promise<FeeSignatureResult>;

  /**
   * Store stake and bake signature
   */
  storeStakeAndBakeSignature(params: StoreStakeAndBakeParams): Promise<void>;
}
