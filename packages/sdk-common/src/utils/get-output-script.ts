import { Env } from '../env';
import { getBitcoin } from './bitcoin';

/**
 * The highest witness version this SDK will build an output for.
 *
 * v0 is P2WPKH and P2WSH, v1 is P2TR. Versions above that are undefined:
 * bitcoinjs-lib will happily compile `OP_n <program>` for any of them, and
 * such an output is spendable by anyone once it is mined. It warns on the
 * console and returns the script, which is not a check.
 */
const MAX_WITNESS_VERSION = 1;

/**
 * Get output script from address.
 *
 * @param address - The address.
 * @param env
 *
 * @returns The output script.
 *
 * @throws if the address is not for this environment's network, or if it names
 * a witness version whose output would not be spendable only by its owner.
 */
export async function getOutputScript(
  address: string,
  env: Env = Env.prod,
): Promise<`0x${string}`> {
  const bitcoin = await getBitcoin();

  assertKnownWitnessVersion(bitcoin, address);

  const outputScriptBuf = bitcoin.address.toOutputScript(
    address,
    env === Env.prod ? bitcoin.networks.bitcoin : bitcoin.networks.testnet,
  );
  const outputScript = outputScriptBuf.toString('hex');
  return `0x${outputScript}`;
}

/**
 * Rejects a bech32 address for a witness version this SDK does not know.
 *
 * Base58 addresses are left to `toOutputScript`, which decides P2PKH or P2SH
 * from the version byte and has no equivalent open end.
 */
function assertKnownWitnessVersion(
  bitcoin: Awaited<ReturnType<typeof getBitcoin>>,
  address: string,
): void {
  let version: number;
  try {
    ({ version } = bitcoin.address.fromBech32(address));
  } catch {
    // Not bech32 at all, or malformed. `toOutputScript` reports it.
    return;
  }

  if (version > MAX_WITNESS_VERSION) {
    throw new Error(
      `${address} is a witness version ${String(version)} address. Only ` +
        `versions up to ${String(MAX_WITNESS_VERSION)} (P2WPKH, P2WSH, P2TR) ` +
        `are supported; an output for a later version can be spent by anyone.`,
    );
  }
}
