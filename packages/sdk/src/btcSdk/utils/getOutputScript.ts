import * as ecc from '@bitcoin-js/tiny-secp256k1-asmjs';
import {
  address as addressUtils,
  initEccLib,
  networks,
  payments,
} from 'bitcoinjs-lib';
import { OEnv, TEnv } from '../../common/types/types';

initEccLib(ecc);

/**
 * Get output script from address.
 *
 * @param address - The address.
 * @param networkMode - The network mode.
 *
 * @returns The output script.
 */
export function getOutputScript(
  address: string,
  env: TEnv = OEnv.prod,
): string {
  const paymentType = getPaymentType(address);

  const payment = payments[paymentType]({
    address,
    network: env === OEnv.prod ? networks.bitcoin : networks.testnet,
  });

  const paymentOutputScript = payment.output?.toString('hex');

  if (!paymentOutputScript) {
    throw new Error('Output script is not found.');
  }

  return `0x${paymentOutputScript}`;
}

function getPaymentType(address: string): 'p2tr' | 'p2wpkh' {
  const result = addressUtils.fromBech32(address);

  const isP2TR = result.version === 1 && result.data.length === 32;
  if (isP2TR) {
    return 'p2tr';
  }

  const isP2WPKH = result.version === 0 && result.data.length === 20;
  if (isP2WPKH) {
    return 'p2wpkh';
  }

  throw new Error('Payment type is not supported.');
}
