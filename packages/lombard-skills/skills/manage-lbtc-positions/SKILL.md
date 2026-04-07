---
name: manage-lbtc-positions
description: Check balances, track deposits, unstake LBTC, redeem to BTC.b, and claim operations
read_when:
  - user wants to check LBTC or BTC.b balance
  - user asks about deposit status or confirmations
  - user wants to unstake LBTC
  - user asks about redeeming LBTC to BTC.b
  - user wants to track their Bitcoin staking position
  - user wants to claim a deposit or unstake redemption
  - user asks about exchange rate
requires: []
metadata:
  emoji: "📊"
  sdkVersion: ">=4.4.0"
---

# Manage LBTC Positions

This skill covers balance checking, deposit tracking, claiming, unstaking LBTC to BTC, redeeming LBTC to BTC.b, and exchange rate queries.

## Checking Balances

### Using the SDK

```typescript
import {
  getTokenContractInfo,
  Token,
  ChainId,
  Env,
} from '@lombard.finance/sdk';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({ chain: base, transport: http() });

// Get LBTC contract info for a specific chain
const lbtcInfo = await getTokenContractInfo(Token.LBTC, ChainId.base, Env.prod);

// Read balance (both LBTC and BTC.b use 8 decimals)
const balance = await client.readContract({
  address: lbtcInfo.address,
  abi: [{
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  }],
  functionName: 'balanceOf',
  args: [userAddress],
});

const formatted = formatUnits(balance, 8);
```

### Using the SDK Client

```typescript
const sdk = await createLombardSDK({
  env: Env.prod,
  providers: { evm: () => window.ethereum },
});

// Query balances through the API namespace
const deposits = await sdk.api.deposits('0x...');
const unstakes = await sdk.api.unstakes('0x...');
```

### Using Agent Tools

```typescript
import { getLbtcBalance, getBtcbBalance, getBalance } from '@lombard.finance/sdk-agent';

// LBTC balance on a specific chain
const lbtc = await getLbtcBalance.execute({
  address: '0x...',
  chainId: 8453, // Base
});
// { balance: '0.05', token: 'LBTC', chain: 'Base', address: '0x...' }

// BTC.b balance
const btcb = await getBtcbBalance.execute({
  address: '0x...',
  chainId: 8453,
});
// { balance: '0.10', token: 'BTC.b', chain: 'Base', address: '0x...' }

// Both balances in a single call
const both = await getBalance.execute({
  address: '0x...',
  chainId: 8453,
});
// { lbtc: '0.05', btcb: '0.10', chain: 'Base', address: '0x...' }
```

## Deposit Status Tracking

Deposits follow a state machine: **pending** -> **notarized** -> **claimable** -> **claimed**.

| Status | Description |
|--------|-------------|
| **Pending** | BTC transaction detected but not yet confirmed by the required number of Bitcoin blocks. |
| **Notarized** | BTC deposit confirmed and notarized by the Lombard consortium. |
| **Claimable** | Ready to be claimed on the destination EVM chain. Requires user action. |
| **Claimed** | LBTC has been minted and delivered to the user's wallet. |

### Using the SDK

```typescript
import {
  getDepositsByAddress,
  getDepositStatus,
  getDepositStatusDisplay,
  calcConfirmations,
  REQUIRED_CONFIRMATIONS,
  isDepositClaimable,
  depositRequiresAction,
  Env,
} from '@lombard.finance/sdk';

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

  if (depositRequiresAction(status)) {
    console.log('Action needed: claim this deposit');
  }

  if (isDepositClaimable(status)) {
    console.log('Ready to claim!');
  }
}
```

### Using the SDK Client API Namespace

```typescript
const deposits = await sdk.api.deposits('0x...');
```

### Monitoring with BtcStake Action

If you have an active `BtcStake` action, use its built-in monitoring:

```typescript
// Event-based (recommended for UIs)
stake.on('progress', (progress) => {
  console.log(`Confirmations: ${progress.confirmations}/${progress.requiredConfirmations}`);
  console.log(`Has enough: ${progress.hasEnoughConfirmations}`);
  console.log(`Claimed: ${progress.isClaimed}`);
});

// Single-shot polling
const result = await stake.monitorDeposit?.();
```

### Using Agent Tools

```typescript
import { getDepositStatusTool } from '@lombard.finance/sdk-agent';

const result = await getDepositStatusTool.execute({
  address: '0x...',
  chainId: 1,
});
// {
//   totalDeposits: 2,
//   deposits: [
//     { txHash, amount, status, statusLabel, description, requiresAction },
//     ...
//   ]
// }
```

## Claiming Notarized Deposits

When a deposit reaches **claimable** status, the user must claim it to receive LBTC. This requires the raw payload and proof from the consortium notarization.

### Using the SDK

```typescript
import { claimLBTC } from '@lombard.finance/sdk';

const txHash = await claimLBTC({
  walletClient,
  chainId: ChainId.base,
  env: Env.prod,
  rawPayload: deposit.rawPayload,   // from deposit data
  proofSignature: deposit.proof,     // from deposit data
});
```

### Using the EVM Deposit Action (with setClaimData)

```typescript
import { AssetId, Chain } from '@lombard.finance/sdk';

const evmDeposit = sdk.chain.evm.deposit({
  assetIn: AssetId.BTCb,
  assetOut: AssetId.LBTC,
  sourceChain: Chain.ETHEREUM,
  destChain: Chain.ETHEREUM,
});

// Set the claim data from notarization
evmDeposit.setClaimData(rawPayload, proofSignature);

await evmDeposit.prepare({ amount: '0.1', recipient: '0x...' });
if (evmDeposit.needsApproval) await evmDeposit.approve();
const { txHash } = await evmDeposit.execute();
```

## Unstaking LBTC (EvmUnstake)

Two output options: native BTC (cross-chain) or BTC.b (same-chain).

### Unstake to Native BTC (LBTC -> BTC, cross-chain)

**Status flow (Ethereum/Sepolia, needs fee auth for BTC.b output):**
`IDLE` -> `NEEDS_FEE_AUTHORIZATION` -> `READY` -> `COMPLETED`

**Status flow (LBTC -> BTC, no fee auth needed):**
`IDLE` -> `READY` -> `COMPLETED`

```typescript
import { AssetId, Chain, EvmOperationStatus } from '@lombard.finance/sdk';

const unstake = sdk.chain.evm.unstake({
  assetIn: AssetId.LBTC,
  assetOut: AssetId.BTC,
  sourceChain: Chain.ETHEREUM,
  destChain: Chain.BITCOIN_MAINNET,
});

// 1. Prepare with amount and BTC recipient
await unstake.prepare({
  amount: '0.01',
  recipient: 'bc1q...', // native BTC address (required for BTC output)
});

// 2. Authorize fee if needed
if (unstake.status === EvmOperationStatus.NEEDS_FEE_AUTHORIZATION) {
  await unstake.authorizeFee();
}

// 3. Execute the unstake transaction
const { txHash } = await unstake.execute();
```

### Unstake to BTC.b (LBTC -> BTC.b, same-chain)

```typescript
const unstake = sdk.chain.evm.unstake({
  assetIn: AssetId.LBTC,
  assetOut: AssetId.BTCb,
  sourceChain: Chain.ETHEREUM,
  destChain: Chain.ETHEREUM,
});

await unstake.prepare({
  amount: '0.01',
  recipient: '0x...', // EVM address
});

// On Ethereum/Sepolia, fee auth IS required for LBTC -> BTC.b
if (unstake.status === EvmOperationStatus.NEEDS_FEE_AUTHORIZATION) {
  await unstake.authorizeFee();
}

const { txHash } = await unstake.execute();
```

## Redeeming BTC.b to BTC (EvmRedeem)

Redeems BTC.b to native BTC. This is the reverse of BTC Deposit. Not the same as LBTC unstaking.

**Status flow (Ethereum/Sepolia):**
`IDLE` -> `NEEDS_FEE_AUTHORIZATION` -> `READY` -> `COMPLETED`

**Status flow (Base/BSC, subsidized):**
`IDLE` -> `READY` -> `COMPLETED`

```typescript
import { AssetId, Chain } from '@lombard.finance/sdk';

const redeem = sdk.chain.evm.redeem({
  assetIn: AssetId.BTCb,
  assetOut: AssetId.BTC,
  sourceChain: Chain.ETHEREUM,
  destChain: Chain.BITCOIN_MAINNET,
});

await redeem.prepare({
  amount: '0.01',
  recipient: 'bc1q...', // BTC address
});

// Fee auth if needed
if (redeem.status === EvmOperationStatus.NEEDS_FEE_AUTHORIZATION) {
  await redeem.authorizeFee();
}

// Approval if needed
if (redeem.needsApproval) {
  await redeem.approve();
}

const { txHash } = await redeem.execute();
```

## Claiming Unstake Redemptions

After an unstake period completes, claim the BTC.b:

```typescript
import { claimUnstakeRedeem } from '@lombard.finance/sdk';

const txHash = await claimUnstakeRedeem({
  walletClient,
  chainId: ChainId.ethereum,
  env: Env.prod,
  requestId: unstakeRequestId,
});
```

## Tracking Unstake Status

### Using the SDK

```typescript
import { getUnstakesByAddress, Env } from '@lombard.finance/sdk';

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

### Using the SDK Client API Namespace

```typescript
const unstakes = await sdk.api.unstakes('0x...');

// Filter options
const redeems = await sdk.api.unstakes('0x...', { show_redeems: true });
const nativeOnly = await sdk.api.unstakes('0x...', { to_native: true });
```

### Using Agent Tools

```typescript
import { getUnstakeStatusTool } from '@lombard.finance/sdk-agent';

const result = await getUnstakeStatusTool.execute({
  address: '0x...',
  chainId: 1,
});
// { totalUnstakes, unstakes: [{ txHash, amount, payoutStatus, payoutTxHash }] }
```

## Exchange Rate

The LBTC/BTC exchange rate changes as staking yield accrues. Always check before staking or unstaking.

### Using the SDK Client

```typescript
// Recommended: returns ratios for all supported tokens
const ratios = await sdk.api.exchangeRatio();

// Access LBTC ratios
const lbtcRatio = ratios.LBTC;
console.log(`LBTC:BTC = ${lbtcRatio.BTCTokenRatio}`);  // How many BTC per 1 LBTC
console.log(`BTC:LBTC = ${lbtcRatio.tokenBTCRatio}`);  // How many LBTC per 1 BTC
```

### Using the Standalone Function

```typescript
import { getExchangeRatio } from '@lombard.finance/sdk';

const ratios = await getExchangeRatio({ env: Env.prod });
```

### Using Agent Tools

```typescript
import { getExchangeRate } from '@lombard.finance/sdk-agent';

const rate = await getExchangeRate.execute({ chainId: 1 });
// {
//   lbtcToBtc: '1.00234',    // 1 LBTC = 1.00234 BTC
//   btcToLbtc: '0.99766',    // 1 BTC = 0.99766 LBTC
//   minStakeAmountBtc: '0.0002',
//   description: '1 LBTC = 1.00234 BTC. ...'
// }
```

## React Hook: useEvmUnstake

```typescript
import { useEvmUnstake, useLombardSDK } from '@lombard.finance/sdk-react';
import { AssetId, Chain, createConfig, Env } from '@lombard.finance/sdk';

const { sdk } = useLombardSDK(
  () => createConfig({ env: Env.prod, providers: { evm: () => window.ethereum! } }),
  [env],
);

const { unstake, txHash, status, error, isLoading, reset } = useEvmUnstake(sdk);

// Runs full lifecycle: prepare -> authorizeFee (if needed) -> execute
await unstake({
  amount: '0.01',
  recipient: 'bc1q...',
  assetOut: AssetId.BTC,
  sourceChain: Chain.ETHEREUM,
  destChain: Chain.BITCOIN_MAINNET,
});

// status.phase: 'idle' | 'preparing' | 'authorizing' | 'ready' | 'executing' | 'complete' | 'error'
```

## Error Handling

Errors do NOT change the action status. The status stays at the step where the error occurred, allowing easy retry:

```typescript
try {
  await unstake.authorizeFee();
} catch (err) {
  // unstake.status is still NEEDS_FEE_AUTHORIZATION
  // unstake.error has the error details
  // Retry: await unstake.authorizeFee();
}
```
