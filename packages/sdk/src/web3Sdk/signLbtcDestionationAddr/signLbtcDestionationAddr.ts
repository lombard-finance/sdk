import { Provider } from '../../provider';
import { IProviderBasedParams } from '../types';

export type SignLbtcDestionationAddrParams = IProviderBasedParams;

/**
 * Signs the destination address for the LBTC in active chain
 * in the current account. Signing is necessary for the
 * generation of the deposit address.
 *
 * @param {SignLbtcDestionationAddrParams} params
 *
 * @returns {Promise<string>} The signature of the message.
 */
export async function signLbtcDestionationAddr(
  params: SignLbtcDestionationAddrParams,
): Promise<string> {
  const provider = new Provider(params);

  const message = `destination chain id is ${params.chainId}`;

  return provider.signMessage(message);
}
