import { IEnvParam } from 'common/types/internalTypes';
import { TChainId } from '../../common/types/types';
import { Provider } from '../../provider';
import { IProviderBasedParams } from '../types';
import { getStakeAndBakeSpenderContract } from './contracts';
import { getStakeAndBakeTypedData } from './getTypedData';
import { getVerifyingContract } from './utils';

const NO_SIGNATURE_ERROR =
  'Failed to obtain a valid signature. The response is undefined or invalid.';

export interface ISignStakeAndBakeParams
  extends Pick<IProviderBasedParams, 'provider'>, IEnvParam {
  /**
   * The address to sign with (owner)
   */
  address: string;
  /**
   * Chain ID for the signature
   */
  chainId: TChainId;
  /**
   * The value to approve
   */
  value: string;
  /**
   * Expiry date as a unix timestamp
   */
  expiry: number;
  /**
   * Optional RPC URL for the network
   */
  rpcUrl?: string;
  /**
   * The key of the vault to authorize
   */
  vaultKey: string;
}

export interface ISignStakeAndBakeResult {
  /**
   * The signature
   */
  signature: string;
  /**
   * The typed data used to generate the signature
   */
  typedData: string;
}

/**
 * Signs stake and bake authorization with EIP-712
 *
 * @param {ISignStakeAndBakeParams} params - Parameters for signing
 * @returns {Promise<ISignStakeAndBakeResult>} The signature and typed data
 */
export async function signStakeAndBake({
  address,
  provider,
  chainId,
  value,
  expiry,
  rpcUrl,
  vaultKey,
  env
}: ISignStakeAndBakeParams): Promise<ISignStakeAndBakeResult> {
  const providerInstance = new Provider({
    provider,
    account: address,
    chainId,
  });

  const verifyingContract = getVerifyingContract(chainId, env);
  const spender = getStakeAndBakeSpenderContract(chainId, vaultKey);

  const typedDataObject = await getStakeAndBakeTypedData({
    chainId,
    expiry,
    owner: address,
    spender,
    value,
    rpcUrl,
    verifyingContract,
  });

  const typedData = JSON.stringify(typedDataObject);

  const signature = await providerInstance.web3?.currentProvider?.request<
    'eth_signTypedData_v4',
    string
  >({
    method: 'eth_signTypedData_v4',
    params: [address, typedData],
  });

  if (typeof signature === 'string') {
    return { signature, typedData };
  }

  if (!signature?.result) {
    throw new Error(NO_SIGNATURE_ERROR);
  }

  return { signature: signature.result, typedData };
}
