import { TChainId } from '../../common/types/types';
import { isValidChain } from '../../common/utils/isValidChain';
import {
  rpcUrlConfig as defaultRpcUrlConfig,
  TRpcUrlConfig,
} from '../../provider/rpcUrlConfig';

/**
 * Get RPC URL configuration for a specific chain.
 * Validates chain support and RPC URL availability.
 *
 * @param {TChainId} chainId - Chain ID to get RPC config for
 * @param {string} [rpcUrl] - Optional custom RPC URL
 * @returns {TRpcUrlConfig} RPC URL configuration for the chain
 * @throws {Error} If chain is not supported or RPC URL is not found
 */
export function getRpcUrlConfigFromChain(
  chainId: TChainId,
  rpcUrl?: string,
): TRpcUrlConfig {
  if (!isValidChain(chainId)) {
    throw new Error(`This chain ${chainId} is not supported`);
  }

  const rpcUrlConfig: TRpcUrlConfig = rpcUrl
    ? { [chainId]: rpcUrl }
    : defaultRpcUrlConfig;

  if (!rpcUrlConfig[chainId]) {
    throw new Error(`RPC URL for chainId ${chainId} not found`);
  }

  return rpcUrlConfig;
}
