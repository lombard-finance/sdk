import { CommonWriteParameters } from '../../common/parameters';
import { makeWalletClient } from '../../clients/wallet-client';

export type SignLbtcDestinationAddrParams = Omit<
  CommonWriteParameters,
  'env' | 'rpcUrl'
>;

/**
 * Signs the destination address for the LBTC in active chain
 * in the current account. Signing is necessary for the
 * generation of the deposit address.
 *
 * @param {SignLbtcDestinationAddrParams} parameters - The parameters.
 * @param {Address} parameters.account - The EVM account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {EIP1193Provider} parameters.provider - The EIP1193 provider.
 *
 * @returns {Promise<string>} The signature of the message.
 */
export async function signLbtcDestinationAddr({
  account,
  chainId,
  provider,
}: SignLbtcDestinationAddrParams): Promise<string> {
  const walletClient = makeWalletClient({ chainId, provider });

  const message = `destination chain id is ${chainId}`;
  const signed = await walletClient.signMessage({ account, message });

  return signed;
}
