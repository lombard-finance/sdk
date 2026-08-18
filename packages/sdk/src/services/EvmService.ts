/**
 * EVM Service
 *
 * Provides EVM-specific operations via contract functions.
 *
 * @module services/EvmService
 */

import type {
  Env,
  EvmChainId,
  EvmProvider,
  EvmService as IEvmService,
  SignNetworkFeeParams,
  SignNetworkFeeResult,
  SignStakeAndBakeParams,
  TRpcUrlConfig,
} from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import type { EIP1193Provider } from 'viem';

import type { ChainId } from '../common/chains';
import { getMintingFee } from '../contract-functions/getLBTCMintingFee/getLBTCMintingFee';
import { getStakeAndBakeFee } from '../contract-functions/getStakeAndBakeFee/getStakeAndBakeFee';
import { signLbtcDestinationAddr } from '../contract-functions/signLbtcDestionationAddr/signLbtcDestinationAddr';
import { signNetworkFee } from '../contract-functions/signNetworkFee/signNetworkFee';
import { signStakeAndBake } from '../contract-functions/signStakeAndBake/signStakeAndBake';
import type { DefiProtocol, StakeAndBakeToken } from '../defi/defi-registry';
import { Token } from '../tokens/token-addresses';

/**
 * EVM Service
 *
 * Implementation of the EvmService interface from sdk-common.
 * Provides EVM contract interactions and fee authorization.
 */
export class EvmService implements IEvmService {
  /**
   * @param env - Active environment.
   * @param rpcUrls - Optional per-chain RPC overrides from the SDK config.
   *   Forwarded to read clients so reads honor configured endpoints instead of
   *   falling back to public defaults.
   */
  constructor(
    private readonly env: Env,
    private readonly rpcUrls?: Partial<TRpcUrlConfig>,
  ) {}

  /** Resolve the configured RPC override for a chain, if any. */
  private getRpcUrl(chainId: EvmChainId): string | undefined {
    return this.rpcUrls?.[chainId as number];
  }

  /**
   * Get minting fee for a chain
   * @param chainId - The chain ID
   * @param token - Optional token (defaults to LBTC). Use Token.BTCb for BTC.b deposits.
   */
  async getMintingFee(chainId: EvmChainId, token?: string): Promise<string> {
    const fee = await getMintingFee({
      token: (token as Token) || Token.LBTC,
      chainId: chainId as ChainId,
      env: this.env,
      rpcUrl: this.getRpcUrl(chainId),
    });
    return fee.toString();
  }

  /**
   * Sign network fee authorization (EIP-712)
   */
  async signNetworkFee(
    params: SignNetworkFeeParams,
  ): Promise<SignNetworkFeeResult> {
    const result = await signNetworkFee({
      fee: new BigNumber(params.fee),
      account: params.account as `0x${string}`,
      chainId: params.chainId as ChainId,
      provider: params.provider as EIP1193Provider,
      env: this.env,
      // Pass token for signing - defaults to LBTC for backwards compatibility
      token: (params.token as Token) ?? Token.LBTC,
      rpcUrl: this.getRpcUrl(params.chainId),
    });

    return {
      signature: result.signature,
      typedData: result.typedData,
    };
  }

  /**
   * Get stake and bake fee for a vault
   */
  async getStakeAndBakeFee(
    chainId: EvmChainId,
    protocol: DefiProtocol,
  ): Promise<string> {
    const fee = await getStakeAndBakeFee({
      chainId: chainId as ChainId,
      protocol,
      rpcUrl: this.getRpcUrl(chainId),
    });
    return fee.toString();
  }

  /**
   * Sign stake and bake authorization
   */
  async signStakeAndBake(
    params: SignStakeAndBakeParams,
  ): Promise<SignNetworkFeeResult> {
    const result = await signStakeAndBake({
      value: new BigNumber(params.value),
      account: params.account as `0x${string}`,
      chainId: params.chainId as ChainId,
      provider: params.provider as EIP1193Provider,
      env: this.env,
      vaultKey: params.vaultKey as DefiProtocol,
      token: params.token as StakeAndBakeToken,
      rpcUrl: this.getRpcUrl(params.chainId),
    });

    return {
      signature: result.signature,
      typedData: result.typedData,
    };
  }

  /**
   * Sign LBTC destination address (for non-Ethereum EVM chains)
   */
  async signLbtcDestination(params: {
    chainId: EvmChainId;
    address: string;
    provider: EvmProvider;
  }): Promise<{ signature: string }> {
    const signature = await signLbtcDestinationAddr({
      account: params.address as `0x${string}`,
      chainId: params.chainId as ChainId,
      provider: params.provider as EIP1193Provider,
    });

    return { signature };
  }
}
