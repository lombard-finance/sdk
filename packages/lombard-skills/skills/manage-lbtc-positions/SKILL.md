---
name: manage-lbtc-positions
description: Check balances, track deposits, monitor unstakes, and redeem LBTC
read_when:
  - user wants to check LBTC or BTC.b balance
  - user asks about deposit status or confirmations
  - user wants to unstake LBTC
  - user asks about redeeming LBTC to BTC.b
  - user wants to track their Bitcoin staking position
requires: []
metadata:
  emoji: "📊"
  sdkVersion: ">=4.4.0"
---

# Manage LBTC Positions

This skill covers reading balances, tracking deposit/unstake statuses, unstaking LBTC to BTC, and redeeming LBTC to BTC.b.

## Checking Balances

### Using the SDK Directly

```typescript
import {
  getTokenContractInfo,
  Token,
  ChainId,
  Env,
} from "@lombard.finance/sdk";
import { createPublicClient, http, formatUnits } from "viem";
import { base } from "viem/chains";

const client = createPublicClient({ chain: base, transport: http() });

// Get LBTC contract info
const lbtcInfo = await getTokenContractInfo(Token.LBTC, ChainId.base, Env.prod);

// Read balance (both LBTC and BTC.b use 8 decimals)
const balance = await client.readContract({
  address: lbtcInfo.address,
  abi: [{
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  }],
  functionName: "balanceOf",
  args: [userAddress],
});

const formatted = formatUnits(balance, 8);
console.log(`LBTC balance: ${formatted}`);
```

### Using Agent Tools

```typescript
import { getLbtcBalance, getBtcbBalance, getBalance } from "@lombard.finance/sdk-agent";

// Check LBTC balance
const lbtc = await getLbtcBalance.execute({
  address: "0x...",
  chainId: 8453, // Base
});
// Returns: { balance: "0.05", token: "LBTC", chain: "Base", address: "0x..." }

// Check BTC.b balance
const btcb = await getBtcbBalance.execute({
  address: "0x...",
  chainId: 8453,
});
// Returns: { balance: "0.10", token: "BTC.b", chain: "Base", address: "0x..." }

// Check both balances in a single call
const both = await getBalance.execute({
  address: "0x...",
  chainId: 8453,
});
// Returns: { lbtc: "0.05", btcb: "0.10", chain: "Base", address: "0x..." }
```

## Tracking Deposit Status

Deposits go through a state machine: **pending** -> **notarized** -> **claimable** -> **claimed**.

- **Pending**: BTC transaction detected but not yet confirmed by the required number of Bitcoin blocks.
- **Notarized**: BTC deposit confirmed and notarized by the Lombard consortium.
- **Claimable**: Ready to be claimed on the destination EVM chain.
- **Claimed**: LBTC has been minted and delivered to the user's wallet.

### Using the SDK

```typescript
import {
  getDepositsByAddress,
  getDepositStatus,
  getDepositStatusDisplay,
  Env,
} from "@lombard.finance/sdk";

const deposits = await getDepositsByAddress({
  address: userAddress,
  env: Env.prod,
});

for (const deposit of deposits) {
  const status = getDepositStatus(deposit);
  const display = getDepositStatusDisplay(status);

  console.log(`TX: ${deposit.txHash}`);
  console.log(`Amount: ${deposit.amount}`);
  console.log(`Status: ${display.label}`);
  console.log(`Description: ${display.description}`);

  if (display.requiresAction) {
    console.log("Action needed: claim this deposit to receive LBTC");
  }
}
```

### Using Agent Tools

```typescript
import { getDepositStatusTool } from "@lombard.finance/sdk-agent";

const result = await getDepositStatusTool.execute({
  address: "0x...",
  chainId: 1, // Ethereum
});
// Returns: {
//   totalDeposits: 2,
//   deposits: [
//     { txHash, amount, status, statusLabel, description, requiresAction },
//     ...
//   ]
// }
```

## Unstaking LBTC

There are two paths to convert LBTC back:

### 1. Unstake to Native BTC (Cross-Chain)

Converts LBTC to native BTC sent to a Bitcoin address. This is a cross-chain operation that takes time for processing.

```typescript
import { unstakeLBTC, ChainId, Env } from "@lombard.finance/sdk";
import { parseUnits } from "viem";

const amount = parseUnits("0.01", 8);
const txHash = await unstakeLBTC({
  walletClient,
  chainId: ChainId.ethereum,
  env: Env.prod,
  amount,
  btcRecipientAddress: "bc1q...", // native BTC destination
});
```

**Important**: A BTC recipient address is required when unstaking to native BTC.

### 2. Redeem to BTC.b (Same-Chain)

Converts LBTC back to BTC.b on the same EVM chain. This is faster since it stays on-chain.

```typescript
import { redeemToken, ChainId, Env } from "@lombard.finance/sdk";
import { parseUnits } from "viem";

const amount = parseUnits("0.01", 8);
const txHash = await redeemToken({
  walletClient,
  chainId: ChainId.base,
  env: Env.prod,
  amount,
});
```

### Using Agent Tools

```typescript
import { prepareUnstake } from "@lombard.finance/sdk-agent";

// Unstake to native BTC
const unstakeTx = await prepareUnstake.execute({
  amount: "0.01",
  outputAsset: "BTC",
  recipient: "bc1q...", // required for BTC output
  chainId: 1,
});
// Returns: { action: "sign_transaction", type: "unstake", params: {...} }

// Redeem to BTC.b (no recipient needed)
const redeemTx = await prepareUnstake.execute({
  amount: "0.01",
  outputAsset: "BTCb",
  chainId: 8453,
});
```

## Tracking Unstake Status

```typescript
import { getUnstakesByAddress, Env } from "@lombard.finance/sdk";

const unstakes = await getUnstakesByAddress({
  address: userAddress,
  env: Env.prod,
});

for (const unstake of unstakes) {
  console.log(`TX: ${unstake.txHash}`);
  console.log(`Amount: ${unstake.amount}`);
  console.log(`Payout status: ${unstake.payoutTxStatus}`);
  if (unstake.payoutTxHash) {
    console.log(`Payout TX: ${unstake.payoutTxHash}`);
  }
}
```

### Using Agent Tools

```typescript
import { getUnstakeStatusTool } from "@lombard.finance/sdk-agent";

const result = await getUnstakeStatusTool.execute({
  address: "0x...",
  chainId: 1,
});
// Returns: {
//   totalUnstakes: 1,
//   unstakes: [{ txHash, amount, payoutStatus, payoutTxHash }]
// }
```

## Exchange Rate

The LBTC/BTC exchange rate changes as staking yield accrues. Always check the rate before staking or unstaking to understand the conversion:

```typescript
import { getExchangeRate } from "@lombard.finance/sdk-agent";

const rate = await getExchangeRate.execute({ chainId: 1 });
// Returns: {
//   lbtcToBtc: "1.00234",    // 1 LBTC = 1.00234 BTC
//   btcToLbtc: "0.99766",    // 1 BTC = 0.99766 LBTC
//   minStakeAmountBtc: "0.0002",
//   description: "1 LBTC = 1.00234 BTC. 1 BTC = 0.99766 LBTC. Min stake: 0.0002 BTC."
// }
```
