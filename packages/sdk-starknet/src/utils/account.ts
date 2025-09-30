import { num, RpcProvider, WalletAccount } from 'starknet';
import { Address } from './common';
import { ERR_NO_PUBKEY } from './err';
import { NormalizedSignature } from './signature';

/** The list of entrypoints that could be the public key getters */
const PUBLIC_KEY_GETTERS = [
  /** The default IAccount<T> public key getter */
  'public_key',
  /** The Braavos wallet account contract public key getter */
  'get_public_key',
  /** The Argent wallet account contract public key getter */
  'get_owner',
  /** The OKX wallet account contract public key getters */
  'getSigner',
];

/** Gets the public key of an account stored in a contract */
export async function getPublicKey(
  accountAddress: Address,
  provider: RpcProvider | WalletAccount,
) {
  let pubkey: string | undefined = undefined;

  const chainId = await provider.getChainId();

  for (const entrypoint of PUBLIC_KEY_GETTERS) {
    try {
      const res = await provider.callContract({
        contractAddress: accountAddress,
        entrypoint,
      });

      if (num.isHex(res[0])) {
        pubkey = res[0];
        console.info(
          `Retrieved pubKey from ${accountAddress} via ${entrypoint}: ${pubkey}`,
        );
      }
    } catch (err) {
      // NOOP
    }
  }

  if (!pubkey) {
    throw ERR_NO_PUBKEY(accountAddress, chainId);
  }

  return pubkey;
}

/**
 * Recovers the full public key from the given signature and signed message hash
 */
export function recoverFullPublicKeys(
  signature: NormalizedSignature,
  hash: string,
) {
  const recoveryBits = [0, 1];

  const keys = [];
  try {
    for (const bit of recoveryBits) {
      const rs = signature.addRecoveryBit(bit);
      const recovered = rs
        .recoverPublicKey(feltToUint8Array(hash))
        .toHex(false);
      keys.push(`0x${recovered}`);
    }
  } catch (err) {
    // NOOP
  }

  return keys;
}

function feltToUint8Array(felt: string | bigint): Uint8Array {
  const value = typeof felt === 'bigint' ? felt : BigInt(felt);
  let hexValue = value.toString(16);
  if (hexValue.length % 2) hexValue = `0${hexValue}`; // Ensure even-length
  return Uint8Array.from(Buffer.from(hexValue, 'hex'));
}
