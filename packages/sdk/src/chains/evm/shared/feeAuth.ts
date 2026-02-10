/**
 * Shared Fee Authorization Logic for EVM Actions
 *
 * Provides fee authorization support for EVM actions that require it:
 * - EvmStake (BTC.b → LBTC on Ethereum/Sepolia)
 * - EvmRedeem (BTC.b → BTC on Ethereum/Sepolia)
 * - EvmUnstake (LBTC → BTC.b on Ethereum/Sepolia)
 *
 * Fee authorization is only required on unsubsidized chains (Ethereum, Sepolia).
 * Other chains (Base, BSC, Avalanche) are subsidized by Lombard.
 *
 * @module chains/evm/shared/feeAuth
 */

import type { Env } from '@lombard.finance/sdk-common';
import type { EIP1193Provider } from 'viem';

import { getNetworkFeeSignature } from '../../../api-functions';
import { storeNetworkFeeSignature } from '../../../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature';
import type { ChainId } from '../../../common/chains';
import { requiresAutoMintFee } from '../../../common/fee-requirements';
import { getMintingFee } from '../../../contract-functions';
import { signNetworkFee } from '../../../contract-functions/signNetworkFee/signNetworkFee';
import { Token } from '../../../tokens/token-addresses';
import { getTokenContractInfo } from '../../../tokens/tokens';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fee authorization state
 */
export interface FeeAuthState {
  /** Whether fee authorization is required for this chain */
  requiresAuth: boolean;
  /** Whether fee authorization is complete (valid signature exists) */
  isAuthorized: boolean;
  /** Minting fee in satoshis (for signing) */
  feeInSatoshis: bigint | null;
  /** Minting fee formatted in BTC (for display) */
  feeFormatted: string | null;
  /** Signature expiration date (Unix timestamp in seconds) */
  expirationDate: string | null;
}

/**
 * Fee authorization check result
 */
export interface FeeAuthCheckResult {
  /** Whether fee authorization is required */
  requiresAuth: boolean;
  /** Whether a valid (non-expired) signature exists */
  hasValidSignature: boolean;
  /** Minting fee in satoshis */
  feeInSatoshis: bigint | null;
  /** Minting fee formatted in BTC */
  feeFormatted: string | null;
  /** Expiration date if signature exists */
  expirationDate: string | null;
}

/**
 * Parameters for fee authorization
 */
export interface AuthorizeFeeParams {
  chainId: ChainId;
  account: `0x${string}`;
  feeInSatoshis: bigint;
  provider: EIP1193Provider;
  env: Env;
  token: Token;
}

// ═══════════════════════════════════════════════════════════════════════════
// Fee Authorization Logic
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if fee authorization is required and if a valid signature exists
 *
 * This should be called in the action's prepare() method to determine
 * whether to transition to NEEDS_FEE_AUTHORIZATION or READY status.
 *
 * @param chainId - The EVM chain ID
 * @param account - The user's EVM account address
 * @param env - The environment (prod, stage, testnet)
 * @param token - The token type (BTCb or LBTC)
 * @returns Fee authorization check result
 */
export async function checkFeeAuthorization(
  chainId: ChainId,
  account: `0x${string}`,
  env: Env,
  token: Token,
): Promise<FeeAuthCheckResult> {
  // Check if this chain requires fee authorization
  if (!requiresAutoMintFee(chainId)) {
    return {
      requiresAuth: false,
      hasValidSignature: false,
      feeInSatoshis: null,
      feeFormatted: null,
      expirationDate: null,
    };
  }

  // Get token address for signature lookup
  const tokenInfo = await getTokenContractInfo(token, chainId, env);

  // Check for existing valid signature on server
  const existingSignature = await getNetworkFeeSignature({
    address: account,
    chainId,
    env,
    tokenAddress: tokenInfo.address,
  });

  // Check if signature exists and is not expired
  const isExpired = existingSignature.expirationDate
    ? new Date(Number(existingSignature.expirationDate) * 1000) < new Date()
    : false;

  const hasValidSignature = existingSignature.hasSignature && !isExpired;

  // If no valid signature, fetch the minting fee
  let feeInSatoshis: bigint | null = null;
  let feeFormatted: string | null = null;

  if (!hasValidSignature) {
    const feeInBtc = await getMintingFee({
      token,
      chainId,
      env,
    });
    feeInSatoshis = BigInt(feeInBtc.times(1e8).toFixed(0));
    feeFormatted = feeInBtc.toFixed(8);
  }

  return {
    requiresAuth: true,
    hasValidSignature,
    feeInSatoshis,
    feeFormatted,
    expirationDate: existingSignature.expirationDate ?? null,
  };
}

/**
 * Authorize fee by signing and storing the signature
 *
 * This should be called from the action's authorizeFee() method.
 *
 * @param params - Authorization parameters
 * @returns The signature
 */
export async function authorizeFee(
  params: AuthorizeFeeParams,
): Promise<{ signature: `0x${string}`; typedData: string }> {
  const { chainId, account, feeInSatoshis, provider, env, token } = params;

  // Get token address for storing signature
  const tokenInfo = await getTokenContractInfo(token, chainId, env);

  // Sign the network fee
  const signResult = await signNetworkFee({
    fee: feeInSatoshis,
    account,
    chainId,
    provider,
    env,
    token,
  });

  // Store the signature on the server
  await storeNetworkFeeSignature({
    signature: signResult.signature,
    typedData: signResult.typedData,
    address: account,
    env,
    tokenAddress: tokenInfo.address,
  });

  return signResult;
}

/**
 * Create initial fee auth state
 */
export function createInitialFeeAuthState(): FeeAuthState {
  return {
    requiresAuth: false,
    isAuthorized: false,
    feeInSatoshis: null,
    feeFormatted: null,
    expirationDate: null,
  };
}
