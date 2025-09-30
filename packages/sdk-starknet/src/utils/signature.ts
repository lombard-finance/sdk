import { ArraySignatureType, WeierstrassSignatureType, ec } from 'starknet';
import { ERR_UNKNOWN_SIGNATURE_FORMAT, ERR_UNSUPPORTED_WALLET } from './err';
import { WalletName } from './wallet-account';

export type NormalizedSignature = WeierstrassSignatureType;

export function normalizeSignature(
  signature: ArraySignatureType,
  walletName?: WalletName,
): NormalizedSignature {
  console.info('Normalizing signature:', signature);

  let sigR = undefined;
  let sigS = undefined;

  if (signature.length === 2) {
    // [r, s] (raw OpenZeppelin or starknet.js)
    const [r, s] = signature;
    console.info(`OpenZeppelin: r = ${r}, s = ${s}`);
    sigR = r;
    sigS = s;
  } else if (
    walletName === 'Braavos' ||
    (signature.length === 3 && signature[0] === '1')
  ) {
    // Braavos: [version, r, s]
    const [version, r, s] = signature;
    console.info(`Braavos: r = ${r}, s = ${s}`);
    sigR = r;
    sigS = s;
  } else if (
    walletName === 'Keplr' ||
    (signature.length === 5 &&
      signature.filter(x => x.startsWith('0x')).length === 5)
  ) {
    // Probably Keplr: [r low, r high, s low, s high, version]

    throw ERR_UNSUPPORTED_WALLET(walletName);
  } else {
    // Argent X: [number of signers, type, pubkey, r, s, ...]
    // https://docs.argent.xyz/aa-use-cases/verifying-signatures-and-cosigners#verifying-multi-signatures
    const [
      signers,
      signerType1,
      pubkey1,
      r1,
      s1,
      signerType2,
      pubkey2,
      r2,
      s2,
    ] = signature;
    console.info(`Argent: r = ${r1}, s = ${s1}`);
    sigR = r1;
    sigS = s1;
  }

  if (sigR && sigS) {
    const sig = new ec.starkCurve.Signature(BigInt(sigR), BigInt(sigS));
    return sig;
  }

  throw ERR_UNKNOWN_SIGNATURE_FORMAT;
}

function normalizeKeplrSignature(signature: ArraySignatureType) {
  // THIS IS ETHEREUM SIGNATURE, secp256k1 curve
  //[r low, r high, s low, s high, version]

  const [r_low, r_high, s_low, s_high, version] = signature;
  const r = (BigInt(r_high) << 128n) + BigInt(r_low);
  const s = (BigInt(s_high) << 128n) + BigInt(s_low);
  let v = BigInt(version);
  if (v === 0n || v === 1n) {
    v += 27n;
  }
  console.info(`Keplr: r = ${r}, s = ${s}, v = ${v}`);
  return `0x${r.toString(16)}${s.toString(16)}${v.toString(16)}`;
}
