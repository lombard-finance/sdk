import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

import { ISolanaWalletProvider } from "../../types";

const SIGN_MESSAGE =
  "I have read and agreed to the terms of service: https://docs.lombard.finance/legals/terms-of-service";

interface SignTermsOfServiceParams {
  provider: ISolanaWalletProvider;
}

/**
 * Signs terms of service.
 *
 * @param {SignTermsOfServiceParams} params
 *
 * @returns {Promise<{ signature: string }>} The signature.
 */
export async function signTermsOfService({
  provider,
}: SignTermsOfServiceParams): Promise<{
  signature: string;
}> {
  const { signature } = await provider.signMessage(
    new Uint8Array(Buffer.from(SIGN_MESSAGE, "utf8")),
  );

  const signatureText = bs58.encode(signature);

  return {
    signature: signatureText,
  };
}
