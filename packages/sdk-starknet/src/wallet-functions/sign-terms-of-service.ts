import { WalletAccount } from "starknet";

import { ChainParameters, StarknetChainId } from "../utils/chains";
import { signMessage } from "./sign-message";

const SIGN_MESSAGE =
  "I have read and agreed to the terms of service: https://docs.lombard.finance/legals/terms-of-service";

interface SignTermsOfServiceParams extends ChainParameters {
  walletAccount: WalletAccount;
}

/**
 * Signs terms of service for Starknet.
 *
 * @param {SignTermsOfServiceParams} params - Parameters including wallet account and chain ID
 * @returns {Promise<{ signature: string; signatureHex: string; account: string; pubKey: string }>} The signature details
 */
export async function signTermsOfService({
  walletAccount,
  chainId = StarknetChainId.SN_MAIN,
}: SignTermsOfServiceParams): Promise<{
  signature: string;
  signatureHex: string;
  account: string;
  pubKey: string;
}> {
  const result = await signMessage({
    message: SIGN_MESSAGE,
    walletAccount,
    chainId,
  });

  // Convert signature array to string format expected by backend
  const signatureString = Array.isArray(result.signature)
    ? JSON.stringify(result.signature)
    : result.signature.toString();

  return {
    signature: signatureString,
    signatureHex: result.signatureHex,
    account: result.account,
    pubKey: result.pubKey,
  };
}
