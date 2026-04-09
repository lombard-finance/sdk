import { Env } from "../env";
import { getBitcoin } from "./bitcoin";

/**
 * Get output script from address.
 *
 * @param address - The address.
 * @param env
 *
 * @returns The output script.
 */
export async function getOutputScript(
  address: string,
  env: Env = Env.prod,
): Promise<`0x${string}`> {
  const bitcoin = await getBitcoin();
  const outputScriptBuf = bitcoin.address.toOutputScript(
    address,
    env === Env.prod ? bitcoin.networks.bitcoin : bitcoin.networks.testnet,
  );
  const outputScript = outputScriptBuf.toString("hex");
  return `0x${outputScript}`;
}
