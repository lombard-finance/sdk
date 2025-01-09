import { TChainId } from '../../common/types/types';
import { getPermitNonce } from '../getPermitNonce';

export interface IStakeAndBakeTypedData {
  chainId: TChainId;
  expiry: number;
  owner: string;
  spender: string;
  value: string;
  rpcUrl?: string;
  verifyingContract: string;
}

/**
 * Generates EIP-712 typed data for stake and bake signature
 *
 * @param {IStakeAndBakeTypedData} params - Parameters for generating typed data
 * @returns {object} The typed data object conforming to EIP-712
 */
export async function getStakeAndBakeTypedData({
  chainId,
  expiry,
  owner,
  spender,
  value,
  rpcUrl,
  verifyingContract,
}: IStakeAndBakeTypedData) {
  const nonce = await getPermitNonce({
    owner,
    chainId,
    rpcUrl,
  });

  return {
    domain: {
      name: 'Lombard Staked Bitcoin',
      version: '1',
      chainId,
      verifyingContract,
    },
    types: {
      EIP712Domain: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'version',
          type: 'string',
        },
        {
          name: 'chainId',
          type: 'uint256',
        },
        {
          name: 'verifyingContract',
          type: 'address',
        },
      ],
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Permit',
    message: {
      owner,
      spender,
      value,
      nonce,
      deadline: expiry.toString(),
    },
  };
}
