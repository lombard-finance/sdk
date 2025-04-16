import { ChainId } from '../common/chains';
import { makePublicClient } from '../clients/public-client';
import { EIP1193Provider, getContract } from 'viem';
import LBTC_ABI from './abi/LBTC_ABI.json';
import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import { getLbtcContractAddresses } from './lbtc-addresses';
import { makeWalletClient } from '../clients/wallet-client';

type GetLBTCContractParameters = {
  /** The chain id on which LBTC contract is deployed. */
  chainId: ChainId;
  /** Optional RPC URL to connect to the blockchain. If not provided, a default RPC URL might be used. */
  rpcUrl?: string;
  /** The environment (optional). If not provided, it defaults to `prod`. */
  env?: Env;
};

/**
 * Gets the LBTC contract by the provided parameters.
 *
 * @throws {Error} - Throws an error if the contract address could not be determined.
 */
export function getLBTCContract({
  chainId,
  rpcUrl,
  env = DEFAULT_ENV,
}: GetLBTCContractParameters) {
  const addresses = getLbtcContractAddresses(env);

  const contractAddress = addresses[chainId];
  if (!contractAddress) {
    throw new Error(
      `Could not determine the LBTC contract address for given chain id: ${chainId} (env: ${env})`,
    );
  }

  const client = makePublicClient({ chainId, rpcUrl });

  const lbtcContract = getContract({
    abi: LBTC_ABI,
    address: contractAddress,
    client,
  });

  return lbtcContract;
}

type GetWriteableLBTCContractParameters = {
  /**
   * The provider (required). An instance of the `EIP1193Provider` which adheres to the EIP-1193 standard for communication with Ethereum-compatible providers.
   * @type {EIP1193Provider}
   */
  provider: EIP1193Provider;
} & Pick<GetLBTCContractParameters, 'chainId' | 'env'>;
export function getWriteableLBTCContract({
  chainId,
  provider,
  env = DEFAULT_ENV,
}: GetWriteableLBTCContractParameters) {
  const addresses = getLbtcContractAddresses(env);

  const contractAddress = addresses[chainId];
  if (!contractAddress) {
    throw new Error(
      `Could not determine the LBTC contract address for given chain id: ${chainId} (env: ${env})`,
    );
  }

  const client = makeWalletClient({ provider, chainId });

  const lbtcContract = getContract({
    abi: LBTC_ABI,
    address: contractAddress,
    client,
  });

  return lbtcContract;
}

export function getLBTCContractInfo(chainId: ChainId, env?: Env) {
  const addresses = getLbtcContractAddresses(env);
  const contractAddress = addresses[chainId];
  if (!contractAddress) {
    throw new Error(
      `Could not determine the LBTC contract address for given chain id: ${chainId} (env: ${env})`,
    );
  }
  return {
    abi: LBTC_ABI,
    address: contractAddress,
    symbol: 'LBTC',
    decimals: 8,
  };
}
