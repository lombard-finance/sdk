import { SuiSignPersonalMessageFeature } from '@mysten/wallet-standard';
import { WalletWithFeatures } from '@wallet-standard/base';
import type { WalletAccount } from '@wallet-standard/core';

const SIGN_MESSAGE =
  'I have read and agreed to the terms of service: https://docs.lombard.finance/legals/terms-of-service';

interface SignTermsOfServiceParams {
  wallet: WalletWithFeatures<SuiSignPersonalMessageFeature>;
  account: WalletAccount;
}

/**
 * Signs terms of service.
 *
 * @param {SignTermsOfServiceParams} params
 *
 * @returns {Promise<{ bytes: string; signature: string }>} The signature and the message.
 */
export async function signTermsOfService({
  wallet,
  account,
}: SignTermsOfServiceParams): Promise<{
  bytes: string;
  signature: string;
}> {
  return wallet.features['sui:signPersonalMessage'].signPersonalMessage({
    message: Buffer.from(SIGN_MESSAGE, 'utf8') as unknown as Uint8Array,
    account,
  });
}
