# @lombard.finance/sdk-solana

Solana SDK for the Lombard Finance platform, providing functionality to interact with Solana wallets and blockchain.

## Features

- Connect to Solana wallets (Phantom, OKX)
- Get SOL and SPL token balances
- Send SOL and SPL tokens
- Sign messages
- Validate Solana addresses
- Network configuration
- Advanced error handling

## Installation

```bash
npm install @lombard.finance/sdk-solana
```

## Usage

### Connecting to a Wallet

```typescript
import { connectWallet, WalletType } from '@lombard.finance/sdk-solana';

// Connect to Phantom wallet
const { publicKey, walletProvider } = await connectWallet({
  walletType: 'phantom',
  network: 'mainnet',
});

console.log('Connected wallet address:', publicKey);
```

### Checking Balances

```typescript
import { getBalance } from '@lombard.finance/sdk-solana';

// Get SOL balance
const { total, decimals } = await getBalance({
  publicKey: '5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CYxjdePDovp',
});

console.log('SOL Balance:', total.toString());

// Get SPL token balance
const tokenBalance = await getBalance({
  publicKey: '5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CYxjdePDovp',
  tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC token address
});

console.log('Token Balance:', tokenBalance.total.toString());
```

### Sending Transactions

```typescript
import { sendTransaction } from '@lombard.finance/sdk-solana';

// Send SOL
const result = await sendTransaction({
  from: walletProvider,
  to: 'ReceipientSolanaAddress',
  amount: '0.1',
});

console.log('Transaction signature:', result.signature);

// Send SPL token
const tokenResult = await sendTransaction({
  from: walletProvider,
  to: 'ReceipientSolanaAddress',
  amount: '10',
  tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC token address
  decimals: 6,
});

console.log('Token transaction signature:', tokenResult.signature);
```

### Signing Messages

```typescript
import { signMessage } from '@lombard.finance/sdk-solana';

const { signature, publicKey } = await signMessage({
  message: 'Hello, Solana!',
  publicKey: walletProvider.publicKey.toString(),
});

console.log('Signature:', signature);
```

### Error Handling

```typescript
import { isSdkError, ErrorCode } from '@lombard.finance/sdk-solana';

try {
  // SDK operation
} catch (error) {
  if (isSdkError(error)) {
    switch (error.code) {
      case ErrorCode.WALLET_NOT_FOUND:
        console.error('Wallet not found:', error.message);
        break;
      case ErrorCode.INVALID_ADDRESS:
        console.error('Invalid address:', error.message);
        break;
      default:
        console.error('Error:', error.message);
    }
  } else {
    console.error('Unknown error:', error);
  }
}
```

## API Reference

For detailed API documentation, see the [API Reference](./docs/api.md).

## License

MIT