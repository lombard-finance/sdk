/**
 * API Service
 *
 * Provides Lombard backend API operations for internal use by actions.
 * Returns minimal types defined in sdk-common.
 *
 * For public APIs with full types, use the exported functions in api-functions/
 * or the SDK namespace methods.
 *
 * @module services/ApiService
 */

import type { Env } from '@lombard.finance/sdk-common';
import type {
  ApiService as IApiService,
  DepositInfo,
  FeeSignatureResult,
  GenerateDepositAddressParams,
  GetDepositAddressParams,
  GetFeeSignatureParams,
  StoreFeeSignatureParams,
  StoreStakeAndBakeParams,
} from '@lombard.finance/sdk-common';

import { generateDepositBtcAddress } from '../api-functions/generateDepositBtcAddress/generateDepositBtcAddress';
import { getDepositBtcAddress } from '../api-functions/getDepositBtcAddress/getDepositBtcAddress';
import { getDepositsByAddress } from '../api-functions/getDepositsByAddress/getDepositsByAddress';
import { getNetworkFeeSignature } from '../api-functions/getNetworkFeeSignature/getNetworkFeeSignature';
import { storeNetworkFeeSignature } from '../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature';
import { storeStakeAndBakeSignature } from '../api-functions/storeStakeAndBakeSignature/storeStakeAndBakeSignature';
import type {
  ChainId,
  SolanaChain,
  StarknetChainId,
  SuiChain,
} from '../common/chains';
import { Token } from '../tokens/token-addresses';

type DestChainId = ChainId | SolanaChain | SuiChain | StarknetChainId;

/**
 * API Service
 *
 * Implementation of the ApiService interface from sdk-common.
 * Wraps low-level API functions for use by actions.
 *
 * @remarks
 * This service returns minimal types (DepositInfo) suitable for internal use.
 * For full deposit details, use getDepositsByAddress() directly.
 */
export class ApiService implements IApiService {
  constructor(private readonly env: Env) {}

  /**
   * Generate a new BTC deposit address
   */
  async generateDepositAddress(
    params: GenerateDepositAddressParams,
  ): Promise<string> {
    return generateDepositBtcAddress({
      address: params.address,
      chainId: params.chainId as DestChainId,
      signature: params.signature,
      token: params.token as Token,
      eip712Data: params.eip712Data,
      signatureData: params.signatureData,
      pubKey: params.pubKey,
      env: this.env,
      partnerId: params.partnerId,
      referrerCode: params.referrerCode,
      captchaToken: params.captchaToken,
    });
  }

  /**
   * Get existing deposit address for a recipient
   */
  async getDepositAddress(
    params: GetDepositAddressParams,
  ): Promise<string | undefined> {
    try {
      const address = await getDepositBtcAddress({
        address: params.address,
        chainId: params.chainId as DestChainId,
        token: params.token as Token,
        env: this.env,
        partnerId: params.partnerId,
      });
      return address || undefined;
    } catch {
      // No address found
      return undefined;
    }
  }

  /**
   * Get deposits for an address
   */
  async getDeposits(address: string): Promise<DepositInfo[]> {
    const deposits = await getDepositsByAddress({
      address,
      env: this.env,
    });

    return deposits.map(d => ({
      depositAddress: d.depositAddress ?? '',
      blockHeight: d.blockHeight,
      isClaimed: d.isClaimed,
      txid: d.txHash,
      amount: d.amount?.toString(),
    }));
  }

  /**
   * Store network fee signature
   */
  async storeFeeSignature(params: StoreFeeSignatureParams): Promise<void> {
    await storeNetworkFeeSignature({
      address: params.address,
      signature: params.signature,
      typedData: params.typedData,
      env: this.env,
      tokenAddress: params.tokenAddress,
    });
  }

  /**
   * Get stored network fee signature
   */
  async getFeeSignature(
    params: GetFeeSignatureParams,
  ): Promise<FeeSignatureResult> {
    return getNetworkFeeSignature({
      address: params.address,
      chainId: params.chainId as ChainId,
      env: this.env,
      tokenAddress: params.tokenAddress,
    });
  }

  /**
   * Store stake and bake signature
   */
  async storeStakeAndBakeSignature(
    params: StoreStakeAndBakeParams,
  ): Promise<void> {
    await storeStakeAndBakeSignature({
      signature: params.signature,
      typedData: params.typedData,
      env: this.env,
    });
  }
}
