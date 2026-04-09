# @lombard.finance/sdk-starknet

The Lombard's Starknet SDK package provides a set of functions that allow interacting with the Lombard protocol and its features.

Read more about Lombard's mission: https://www.lombard.finance

**⚠️ THIS PACKAGE IS EXPERIMENTAL USE AT YOUR OWN RISK!**

## Installation

### Installing per dependencies

```
npm install @noble/hashes@^1.7.2 axios@^1 bignumber.js@^9
```

### Installing SDK

```
npm install @lombard.finance/sdk-common@^3.3.0 @lombard.finance/sdk@^3.6.0 @lombard.finance/sdk-starknet
```

## Usage

### Getting or generating the BTC deposit address

```javascript
import {
  Env,
  generateDepositBtcAddress,
  getDepositBtcAddress,
} from "@lombard.finance/sdk";
import { signLbtcDestinationAddrStarknet } from "@lombard.finance/sdk-starknet";

let depositAddress = await getDepositBtcAddress({
  address: walletAccount.address, // connected wallet address,
  chainId: StarknetChainId.SN_SEPOLIA, // the chain identifier, other available options are: StarknetChainId.SN_MAIN
  env: Env.stage, // the environment, use Env.stage for StarknetChainId.SN_SEPOLIA testing,
  partnerId: ENV_PARTNER_ID, // your partner id
});

if (!depositAddress) {
  // Step 1: sign destination address
  const sig = await signLbtcDestinationAddrStarknet({
    walletAccount: walletAccount, // connected wallet account
    chainId: StarknetChainId.SN_SEPOLIA, // the chain identifier, other available options are: StarknetChainId.SN_MAIN
  });

  // Step 2: generate address
  depositAddress = await generateDepositBtcAddress({
    address: walletAccount.address, // connected wallet address,
    chainId: StarknetChainId.SN_SEPOLIA, // the chain identifier, other available options are: StarknetChainId.SN_MAIN
    signature: sig.signatureHex, // the signature hex from step 1
    pubKey: sig.pubKey, // the pubkey from step 1
    env: Env.stage, // the environment, use Env.stage for StarknetChainId.SN_SEPOLIA testing,
    partnerId: ENV_PARTNER_ID, // your partner id
  });
}
```

### Deposit status

```javascript
import { getDepositsByAddress } from "@lombard.finance/sdk";

const deposits = await getDepositsByAddress({
  address: walletAccount.address, // connected wallet address,
  env: Env.stage, // the environment, use Env.stage for StarknetChainId.SN_SEPOLIA testing,
});
```

The above results with an array of:

- `txid: string;` - The BTC transaction id,
- `index?: number;` - The index of the BTC transaction,
- `value: BigNumber;` - The deposit amount,
- `address: Address;` - The source address,
- `chainId: ChainId | SuiChain | SolanaChain | StarknetChain;` -
- `isClaimed?: boolean;` - A flag determining whether the particular deposit has been claimed,
- `claimedTxId?: string;` - The claimed transaction id,
- `rawPayload?: string;` - The raw deposit payload,
- `signature?: string;` - The deposit signature,
- `notarizationWaitDur?: Seconds;` - Approx. number of seconds until notarization completed,
- `payload?: string;` - The deposit payload,
- `notarizationStatus: ENotarizationStatus;` - The notarization status.

### Minting LBTC

```javascript
import { mint, Token } from "@lombard.finance/sdk-starknet";

const mintParams = {
  amount: d.value, // The deposit amount
  depositIndex: d.index, // The index of the BTC transaction
  depositPayload: d.rawPayload, // The raw deposit payload
  depositProofSignature: d.signature, // The deposit signature
  depositTxId: d.txid, // The BTC transaction id
  token: Token.LBTC, // The token identifier
  walletAccount: walletAccount, // connected wallet account
};

const txHash = await mint(mintParams);
```

### Checking the balance of LBTC

```javascript
import { balanceOf, Token, StarknetChain } from "@lombard.finance/sdk-starknet";

const tokenBalance = await balanceOf({
  account: walletAccount, // an instance of the WalletAccount class
  token: Token.LBTC, // the token identifier, other available tokens are: Token.ETH and Token.STRK
  chainId: StarknetChainId.SN_SEPOLIA, // the chain identifier, other available options are: StarknetChainId.SN_MAIN
});
```

### Redeeming LBTC

```javascript
import { redeem, Token } from "@lombard.finance/sdk-starknet";

const txHash = await redeem({
  amount: amount, // amount to be redeemed, e.g. `BigNumber(0.02)`
  btcAddress: btcAddress, // the BTC destination address
  token: Token.LBTC, // The token identifier
  walletAccount: walletAccount, // connected wallet account
});
```
