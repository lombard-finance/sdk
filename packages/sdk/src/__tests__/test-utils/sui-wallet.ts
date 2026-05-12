import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

export function createSuiWallet(privateKey: string) {
  // Handle bech32 format (suiprivkey1...) or hex format
  if (privateKey.startsWith('suiprivkey')) {
    const { secretKey } = decodeSuiPrivateKey(privateKey);
    return Ed25519Keypair.fromSecretKey(secretKey);
  }

  // Fallback: hex string (with or without 0x)
  const hex = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  return Ed25519Keypair.fromSecretKey(Buffer.from(hex, 'hex'));
}
