---
name: stake-bitcoin
description: Stake Bitcoin to receive LBTC (Lombard Staked Bitcoin) for yield
read_when:
  - user wants to stake Bitcoin or BTC
  - user wants to get LBTC
  - user mentions BTC.b to LBTC conversion
  - user asks about Bitcoin staking yield
  - user wants to deposit BTC for staking
requires: []
metadata:
  emoji: "₿"
  sdkVersion: ">=4.4.0"
---

# Stake Bitcoin to Get LBTC

LBTC (Lombard Staked Bitcoin) is a yield-bearing token representing Bitcoin staked through the Babylon staking protocol. Staking BTC gives you LBTC, which accrues yield over time while remaining liquid for DeFi.

## Staking Paths

There are two ways to get LBTC:

1. **BTC.b Staking (EVM, on-chain)**: If you already have BTC.b (wrapped Bitcoin) on an EVM chain, you can convert it directly to LBTC through the Lombard staking contract. This is instant once the transaction confirms.

2. **Native BTC Deposit (cross-chain)**: Send native BTC to a Lombard-generated deposit address. The Lombard consortium notarizes the deposit, after which you can claim your LBTC on your chosen EVM chain. This takes longer due to BTC block confirmations and notarization.

## Important Notes

- **Minimum stake**: 0.0002 BTC (20,000 satoshis)
- **Fee authorization on Ethereum**: Staking on Ethereum mainnet (chain ID 1) and Sepolia (chain ID 11155111) requires an EIP-712 fee authorization signature before the stake transaction. Base does not require this.
- **Exchange rate**: 1 BTC.b does NOT mint exactly 1 LBTC. The exchange rate changes as staking yield accrues. Always check the current rate before staking.
- **Decimals**: Both LBTC and BTC.b use 8 decimals.

## BTC.b to LBTC Staking (SDK)

```typescript
import {
  depositToken,
  getTokenContractInfo,
  getLBTCExchangeRate,
  Token,
  Env,
  ChainId,
} from "@lombard.finance/sdk";
import { createWalletClient, http, parseUnits } from "viem";
import { base } from "viem/chains";

// 1. Check the current exchange rate
const rate = await getLBTCExchangeRate({ env: Env.prod });
console.log("Min stake (satoshis):", rate.minAmount);

// 2. Get token contract info
const btcbInfo = await getTokenContractInfo(Token.BTCb, ChainId.base, Env.prod);
const lbtcInfo = await getTokenContractInfo(Token.LBTC, ChainId.base, Env.prod);

// 3. Create wallet client (user must provide their own signer)
const walletClient = createWalletClient({
  chain: base,
  transport: http(),
  account: userAddress, // user's connected wallet address
});

// 4. Approve BTC.b spending if needed (standard ERC20 approve)
// Check allowance first, then approve the staking contract if needed

// 5. Execute the stake transaction
const amount = parseUnits("0.01", 8); // 0.01 BTC.b
const txHash = await depositToken({
  walletClient,
  chainId: ChainId.base,
  env: Env.prod,
  amount,
});
```

### Fee Authorization (Ethereum Only)

On Ethereum mainnet and Sepolia, you must sign an EIP-712 fee authorization before staking:

```typescript
import {
  getLBTCMintingFee,
  signNetworkFee,
  storeNetworkFeeSignature,
  requiresAutoMintFee,
  ChainId,
  Env,
} from "@lombard.finance/sdk";

// Check if fee authorization is needed
if (requiresAutoMintFee(ChainId.ethereum)) {
  // 1. Get the current minting fee
  const fee = await getLBTCMintingFee({ env: Env.prod });

  // 2. Sign the fee authorization (EIP-712 typed data)
  const signature = await signNetworkFee({
    walletClient,
    chainId: ChainId.ethereum,
    env: Env.prod,
    fee,
  });

  // 3. Store the signature with Lombard's backend
  await storeNetworkFeeSignature({
    address: userAddress,
    chainId: ChainId.ethereum,
    env: Env.prod,
    signature,
  });

  // 4. Now proceed with depositToken as above
}
```

## Native BTC Deposit Flow

For users who want to deposit native BTC (not BTC.b):

```typescript
import {
  getDepositBtcAddress,
  getDepositsByAddress,
  getDepositStatus,
  getDepositStatusDisplay,
  ChainId,
  Env,
} from "@lombard.finance/sdk";

// 1. Get or generate a BTC deposit address for the user's EVM wallet
const btcAddress = await getDepositBtcAddress({
  address: userEvmAddress,
  chainId: ChainId.base,
  env: Env.prod,
});
// If no address exists, a wallet signature is required to generate one

// 2. User sends native BTC to btcAddress from their Bitcoin wallet

// 3. Track deposit status
const deposits = await getDepositsByAddress({
  address: userEvmAddress,
  env: Env.prod,
});

for (const deposit of deposits) {
  const status = getDepositStatus(deposit);
  const display = getDepositStatusDisplay(status);
  console.log(`Deposit ${deposit.txHash}: ${display.label}`);
  console.log(`  ${display.description}`);
  if (display.requiresAction) {
    console.log("  Action required: claim this deposit");
  }
}
```

## Using Agent Tools

If you are building an AI agent, use `@lombard.finance/sdk-agent` for pre-built tool definitions:

```typescript
import { prepareStake, getExchangeRate, getDepositBtcAddress } from "@lombard.finance/sdk-agent";

// Check exchange rate
const rate = await getExchangeRate.execute({ chainId: 8453 });
// Returns: { lbtcToBtc, btcToLbtc, minStakeAmountBtc, description }

// Prepare a stake transaction (returns params for wallet signing)
const stakeTx = await prepareStake.execute({ amount: "0.01", chainId: 8453 });
// Returns: { action: "sign_transaction", type: "stake", params: {...} }

// Get BTC deposit address
const deposit = await getDepositBtcAddress.execute({
  address: "0x...",
  chainId: 8453,
});
// Returns: { btcAddress, chain, note }
```

### With Vercel AI SDK

```typescript
import { lombardTools } from "@lombard.finance/sdk-agent/vercel";
import { streamText } from "ai";

const result = streamText({
  model: yourModel,
  tools: lombardTools,
  messages: [{ role: "user", content: "Stake 0.01 BTC.b to LBTC on Base" }],
});
```

## Supported Chains

| Chain | Chain ID | Fee Auth Required | Environment |
|-------|----------|-------------------|-------------|
| Ethereum | 1 | Yes | `Env.prod` |
| Base | 8453 | No | `Env.prod` |
| Sepolia | 11155111 | Yes | `Env.testnet` |
| Base Sepolia | 84532 | No | `Env.testnet` |
