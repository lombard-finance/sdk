import { ArraySignatureType, ec, WeierstrassSignatureType } from 'starknet';

import { ERR_UNKNOWN_SIGNATURE_FORMAT, ERR_UNSUPPORTED_WALLET } from './err';
import { WalletName } from './wallet-account';

export type NormalizedSignature = WeierstrassSignatureType;

export function normalizeSignature(
  signature: ArraySignatureType,
  walletName?: WalletName,
): NormalizedSignature {
  let sigR = undefined;
  let sigS = undefined;

  if (signature.length === 2) {
    // [r, s] (raw OpenZeppelin or starknet.js)
    const [r, s] = signature;
    sigR = r;
    sigS = s;
  } else if (
    walletName === 'Braavos' ||
    (signature.length === 3 && signature[0] === '1')
  ) {
    // Braavos: [version, r, s]
    const [_version, r, s] = signature;
    sigR = r;
    sigS = s;
  } else if (
    walletName === 'Keplr' ||
    (signature.length === 5 &&
      signature.filter((x) => x.startsWith('0x')).length === 5)
  ) {
    // Probably Keplr: [r low, r high, s low, s high, version]

    throw ERR_UNSUPPORTED_WALLET(walletName);
  } else {
    // Argent X: [number of signers, type, pubkey, r, s, ...]
    // https://docs.argent.xyz/aa-use-cases/verifying-signatures-and-cosigners#verifying-multi-signatures
    const [
      _signers,
      _signerType1,
      _pubkey1,
      r1,
      s1,
      _signerType2,
      _pubkey2,
      _r2,
      _s2,
    ] = signature;
    sigR = r1;
    sigS = s1;
  }

  if (sigR && sigS) {
    const sig = new ec.starkCurve.Signature(BigInt(sigR), BigInt(sigS));
    return sig;
  }

  throw ERR_UNKNOWN_SIGNATURE_FORMAT;
}
