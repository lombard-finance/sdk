import * as ecc from '@bitcoin-js/tiny-secp256k1-asmjs';
import { address as addressUtils, initEccLib, networks } from 'bitcoinjs-lib';
import { Env } from '../env';

initEccLib(ecc);

/**
 * Get output script from address.
 *
 * @param address - The address.
 * @param env
 *
 * @returns The output script.
 */
export function getOutputScript(
  address: string,
  env: Env = Env.prod,
): `0x${string}` {
  console.info(`Getting output script for ${address} (${env})`);

  const outputScriptBuf = addressUtils.toOutputScript(
    address,
    env === Env.prod ? networks.bitcoin : networks.testnet,
  );
  const outputScript = outputScriptBuf.toString('hex');
  return `0x${outputScript}`;
}
