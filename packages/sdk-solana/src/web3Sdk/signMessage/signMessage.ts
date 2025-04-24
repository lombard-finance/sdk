import bs58 from 'bs58';
import { SolanaProviderInterface } from '../../types';
import { ErrorCode } from '../../types/errors';
import { wrapError } from '../../utils/errors';

/**
 * Result of a sign message operation
 */
export interface SignMessageResult {
  /**
   * The signature bytes
   */
  signatureBytes: Uint8Array;

  /**
   * The signature in base58 format
   */
  signature: string;

  /**
   * The public key that signed the message
   */
  publicKey: string;
}

/**
 * Sign a message using the connected wallet
 * @param provider - Wallet provider with signing capability
 * @param params - Parameters for signing a message
 * @returns The signature and public key
 */
export async function signMessage(
  provider: SolanaProviderInterface,
  message: string,
): Promise<SignMessageResult> {
  try {
    const publicKey = provider.publicKey;
    if (!publicKey) {
      throw wrapError(
        new Error('No public key available'),
        ErrorCode.NO_ACCOUNT_ERROR,
        'No account connected',
      );
    }

    try {
      const messageBytes = new TextEncoder().encode(message);
      const { signature } = await provider.signMessage(messageBytes);

      return {
        signatureBytes: signature,
        signature: bs58.encode(signature),
        publicKey: publicKey.toString(),
      };
    } catch (error) {
      throw wrapError(
        error,
        ErrorCode.SIGNING_REJECTED,
        'Message signing was rejected',
      );
    }
  } catch (error) {
    throw wrapError(error);
  }
}
