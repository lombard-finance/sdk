import { bitcoin } from './bitcoin';
import { Env } from '../env';

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

  const outputScriptBuf = bitcoin.address.toOutputScript(
    address,
    env === Env.prod ? bitcoin.networks.bitcoin : bitcoin.networks.testnet,
  );
  const outputScript = outputScriptBuf.toString('hex');
  return `0x${outputScript}`;
}
