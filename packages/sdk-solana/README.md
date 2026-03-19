# @lombard.finance/sdk-solana

The Lombard's Solana SDK package provides a set of function that allow interacting with the Lombard protocol and its features for Solana users.

## Installation

```bash
npm install @lombard.finance/sdk @lombard.finance/sdk-solana
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

### Generating BTC deposit address

Similar to the EVM SDK (`@lombard.finance/sdk`) the generation of the deposit address requires a signature.
To successfully generate a deposit address run `signLbtcDestinationAddrSolana` and then use the generated signature as a parameter of the EVM SDK's `generateDepositBtcAddress`.

```javascript

const { signature } = await signLbtcDestinationAddrSolana({
  // The connected wallet provider:
  provider: walletProvider,
  // The chosen Solana chain (network):
  network: 'mainnet-beta'
});

const depositAddress = await generateDepositBtcAddress({
  // The connected address
  address,
  // The chosen Solana chain (network) - prefixed with `solana:`
  chainId: 'solana:mainnet-beta',
  // The generated signature:
  signature,
  // Optional env
  env: Env.prod,
  // Optional partnerId
  partnerId,
}),

```

### Claiming LBTC

This operation mints the deposited amount of BTC into LBTC and transfers that
to the provided recipient address.

```javascript
const txHash = await claimLBTC(provider, {
  recipientAddress: address,
  amount: '10000',
  network: 'mainnet-beta',
  // The signatures (obtained from `getDepositsByAddress`)
  proofSignature: selectedOutput.proof,
  rawPayload: selectedOutput.raw_payload,
});
```

### Unstaking LBTC

This operation burns given amount of LBTC and initiates transfer of BTC to the
given BTC address.

```javascript
const txHash = await unstakeLBTC(provider, {
  amount: '10000',
  btcAddress,
  network: 'mainnet-beta',
});
```

### Redeeming tokens for BTC (Asset Router)

Burns BTC.b or LBTC on Solana and sends a GMP message through the Mailbox to
trigger a BTC payout to the specified Bitcoin address.

```typescript
import { redeemForBtc } from '@lombard.finance/sdk-solana';

// BTC.b → BTC (default)
const txHash = await redeemForBtc(provider, {
  amount: '2000',
  btcAddress: 'bc1q...',
  network: 'devnet',
  env: 'stage',
});

// LBTC → BTC (pass LBTC mint)
const txHash = await redeemForBtc(provider, {
  amount: '2000',
  btcAddress: 'bc1q...',
  tokenMint: 'LBTCojyVJ63rsEED2DLEGWMzSxWJyQynXE91LMLgV1J',
  network: 'devnet',
  env: 'dev',
});
```

### Redeeming LBTC for BTC.b (Asset Router)

Burns LBTC and sends a GMP message to route BTC.b to the recipient on Solana.

```typescript
import { redeem } from '@lombard.finance/sdk-solana';

const txHash = await redeem(provider, {
  amount: '2000',
  recipient: '8yarEiDaJVik7n6wX8JCbubTbtZD3WZ67Q1ytMDA2BKA',
  network: 'devnet',
  env: 'dev',
});
```

Optional overrides: `tokenMint` (source token), `toTokenAddress` (destination
token), `toLchainId` (destination chain). All default to LBTC → BTC.b on Solana.
