import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities';
import { Umi } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import BigNumber from 'bignumber.js';

const umiInstances: Record<string, Umi> = {};
export function getMinimalUmiInstance(rpcUrl: string): Umi {
  if (!umiInstances[rpcUrl]) {
    umiInstances[rpcUrl] = createUmi(rpcUrl);
  }
  return umiInstances[rpcUrl];
}

export const getRecipientBytes32 = (recipientAddress: string) => {
  let recipientBytes32: Uint8Array;
  try {
    const cleanedRecipientAddress = recipientAddress.startsWith('0x')
      ? recipientAddress.substring(2)
      : recipientAddress;
    recipientBytes32 = addressToBytes32(`0x${cleanedRecipientAddress}`);
  } catch (e) {
    console.error('Error converting recipient address:', recipientAddress, e);
    throw new Error(
      `Invalid recipient address format for destination chain: ${recipientAddress}. Ensure it's a valid hex address.`,
    );
  }
  return recipientBytes32;
};

export const validateBridgeAmount = (amount: BigNumber) => {
  if (amount.isNaN() || amount.isLessThanOrEqualTo(0)) {
    throw new Error(`Invalid amount for bridging: ${amount}`);
  }
};
