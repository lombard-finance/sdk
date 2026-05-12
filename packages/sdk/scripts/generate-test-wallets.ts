import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { Keypair } from '@solana/web3.js';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import bs58 from 'bs58';

console.log('=== GENERATE NEW TEST WALLETS ===');
console.log('⚠️  Store these securely and NEVER use for production!\n');

// EVM
const evmPrivateKey = generatePrivateKey();
const evmAccount = privateKeyToAccount(evmPrivateKey);
console.log('EVM Wallet:');
console.log(`  Private Key: ${evmPrivateKey}`);
console.log(`  Address: ${evmAccount.address}\n`);

// Solana
const solanaKeypair = Keypair.generate();
console.log('Solana Wallet:');
console.log(`  Secret Key (base58): ${bs58.encode(solanaKeypair.secretKey)}`);
console.log(`  Public Key: ${solanaKeypair.publicKey.toString()}\n`);

// Sui
const suiKeypair = new Ed25519Keypair();
console.log('Sui Wallet:');
console.log(`  Private Key: ${suiKeypair.getSecretKey()}`);
console.log(`  Address: ${suiKeypair.getPublicKey().toSuiAddress()}\n`);

console.log('=== COPY THESE TO .env.test ===');
