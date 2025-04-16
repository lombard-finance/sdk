import * as ecc from '@bitcoin-js/tiny-secp256k1-asmjs';
import {
  address as addressUtils,
  initEccLib,
  networks,
  payments,
} from 'bitcoinjs-lib';
import { Env } from '../env';

initEccLib(ecc);

type AddressType = 'p2tr' | 'p2wpkh' | 'p2wsh';

/**
 * Get output script from address.
 *
 * @param address - The address.
 * @param env
 *
 * @returns The output script.
 */
export function getOutputScript(address: string, env: Env = Env.prod): string {
  const addressType = getAddressType(address);

  const payment = payments[addressType]({
    address,
    network: env === Env.prod ? networks.bitcoin : networks.testnet,
  });

  const paymentOutputScript = payment.output?.toString('hex');

  if (!paymentOutputScript) {
    throw new Error('Output script is not found.');
  }

  return `0x${paymentOutputScript}`;
}

function getAddressType(address: string): AddressType {
  const result = addressUtils.fromBech32(address);

  const isP2TR = result.version === 1 && result.data.length === 32;
  if (isP2TR) {
    return 'p2tr';
  }

  const isP2WPKH = result.version === 0 && result.data.length === 20;
  if (isP2WPKH) {
    return 'p2wpkh';
  }

  if (isP2WSHAddressType(address)) {
    return 'p2wsh';
  }

  throw new Error('Address type is not supported.');
}

function isP2WSHAddressType(address: string): boolean {
  return (
    (address.startsWith('bc1') || address.startsWith('tb1')) &&
    address.length === 62
  );
}
