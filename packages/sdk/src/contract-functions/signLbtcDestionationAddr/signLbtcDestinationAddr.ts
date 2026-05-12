import { makeWalletClient } from '../../clients/wallet-client';
import { CommonWriteParameters } from '../../common/parameters';

export type SignLbtcDestinationAddrParams = Omit<
  CommonWriteParameters,
  'env' | 'rpcUrl'
>;

/**
 * Generates the address confirmation message for a given chain ID.
 *
 * This is the exact message text that the backend expects when verifying
 * address confirmation signatures. The format is shared across all chain
 * types (EVM, Solana, Sui, Starknet).
 *
 * Use this function when you need to construct the message independently
 * (e.g., for custom signing flows) instead of using {@link signLbtcDestinationAddr}.
 *
 * @param chainId - The numeric chain ID (e.g., 43114 for Avalanche).
 * @returns The confirmation message string to be signed.
 *
 * @example
 * ```ts
 * import { getAddressConfirmationMessage } from '@lombard.finance/sdk';
 * import { ChainId } from '@lombard.finance/sdk';
 *
 * const message = getAddressConfirmationMessage(ChainId.avalanche);
 * // "destination chain id is 43114"
 *
 * // Sign with your own signer
 * const signature = await signer.signMessage(message);
 * ```
 */
export function getAddressConfirmationMessage(
  chainId: string | number,
): string {
  return `destination chain id is ${chainId}`;
}

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

  const message = getAddressConfirmationMessage(chainId);
  const signed = await walletClient.signMessage({ account, message });

  return signed;
}
