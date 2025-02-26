import {
  SuiChain,
  SuiSignPersonalMessageFeature,
} from '@mysten/wallet-standard';

import { WalletWithFeatures } from '@wallet-standard/base';
import type { WalletAccount } from '@wallet-standard/core';
import { getUnifiedChainId } from '../../getUnifiedChainId';
import { PHANTOM_WALLET_NAME } from '../../const';

export const SIGNATURE_SIZE = -132;

interface SignLbtcDestinationAddrSuiParams {
  chainId: SuiChain;
  wallet: WalletWithFeatures<SuiSignPersonalMessageFeature>;
  account: WalletAccount;
}

/**
 * Signs the destination address for the LBTC in active chain
 * in the current account. Signing is necessary for the
 * generation of the deposit address.
 *
 * @param {SignLbtcDestinationAddrSuiParams} params
 *
 * @returns {Promise<{ bytes: string; signature: string }>} The signature and the message.
 */
export async function signLbtcDestinationAddrSui({
  chainId,
  wallet,
  account,
}: SignLbtcDestinationAddrSuiParams): Promise<{
  bytes: string;
  signature: string;
}> {
  const message = Buffer.from(
    `destination chain id is ${getUnifiedChainId(chainId)}`,
    'utf8',
  );

  const isPhantomWallet = wallet.name === PHANTOM_WALLET_NAME;

  return wallet.features['sui:signPersonalMessage'].signPersonalMessage({
    message: (isPhantomWallet
      ? message.toString('base64')
      : message) as unknown as Uint8Array,
    account,
  });
}
