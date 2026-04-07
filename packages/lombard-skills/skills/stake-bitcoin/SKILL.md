---
name: stake-bitcoin
description: Stake Bitcoin to receive LBTC (Lombard Staked Bitcoin) for yield
read_when:
  - user wants to stake Bitcoin or BTC
  - user wants to get LBTC
  - user mentions BTC.b to LBTC conversion
  - user asks about Bitcoin staking yield
  - user wants to deposit BTC for staking
  - user asks about deposit address generation
  - user asks about StakeAndBake or stake-and-deploy
requires: []
metadata:
  emoji: "₿"
  sdkVersion: ">=4.4.0"
---

# Stake Bitcoin to Get LBTC

LBTC (Lombard Staked Bitcoin) is a yield-bearing token representing Bitcoin staked through the Babylon staking protocol. The exchange rate between LBTC and BTC changes over time as yield accrues, so 1 LBTC is always worth >= 1 BTC.

## Staking Paths

### 1. Native BTC Deposit (BTC to LBTC, cross-chain)

Send native BTC to a Lombard-generated deposit address and receive LBTC on your chosen destination chain. This is the primary staking path and uses the **BtcStake** workflow class.

### 2. BTC.b On-Chain Staking (BTC.b to LBTC, same-chain)

If you already have BTC.b (wrapped Bitcoin) on an EVM chain, convert it to LBTC through the **EvmStake** workflow class. Instant once the transaction confirms.

### 3. StakeAndBake (BTC to LBTC to Vault, atomic)

Stake BTC and automatically deploy the resulting LBTC into a DeFi vault in one flow. Uses the **BtcStakeAndDeploy** workflow class.

## Important Notes

- **Minimum stake**: 0.0002 BTC (20,000 satoshis)
- **Exchange rate is NOT 1:1**: Always call `getExchangeRate` or `sdk.api.exchangeRatio()` to get the current rate. Never hardcode or cache it.
- **Decimals**: Both LBTC and BTC.b use 8 decimals.
- **Fee authorization on Ethereum**: Staking to Ethereum mainnet or Sepolia requires an EIP-712 fee authorization signature. Other chains require an EIP-191 address confirmation signature instead.

## Native BTC Deposit: Full BtcStake Lifecycle

The BtcStake action follows a strict lifecycle. Every step is required.

**Status flow (Ethereum destination):**
`IDLE` -> `NEEDS_FEE_AUTHORIZATION` -> `READY` -> `ADDRESS_READY`

**Status flow (non-Ethereum destination):**
`IDLE` -> `NEEDS_ADDRESS_CONFIRMATION` -> `READY` -> `ADDRESS_READY`

```typescript
import {
  createLombardSDK,
  AssetId,
  Chain,
  Env,
  BtcActionStatus,
} from '@lombard.finance/sdk';

// 1. Initialize the SDK
const sdk = await createLombardSDK({
  env: Env.prod,
  providers: {
    evm: () => window.ethereum,
    bitcoin: () => bitcoinProvider,
  },
});

// 2. Create a BtcStake action
const stake = sdk.chain.btc.stake({
  assetOut: AssetId.LBTC,
  destChain: Chain.ETHEREUM,
});

// 3. Prepare: validates amount/recipient, checks for existing deposit/fee auth
await stake.prepare({
  amount: '0.1',          // human-readable BTC
  recipient: '0xAbC...',  // destination EVM address
  referralCode: 'ref123', // optional
});

// 4. Authorize: signs either fee (EIP-712) or address confirmation (EIP-191)
//    Status will be NEEDS_FEE_AUTHORIZATION or NEEDS_ADDRESS_CONFIRMATION
if (
  stake.status === BtcActionStatus.NEEDS_FEE_AUTHORIZATION ||
  stake.status === BtcActionStatus.NEEDS_ADDRESS_CONFIRMATION
) {
  await stake.authorize(); // triggers wallet signature popup
}

// 5. Generate deposit address: sends signature to API, gets BTC address back
const btcDepositAddress = await stake.generateDepositAddress();
// Returns a bc1... address

// 6. User sends BTC to btcDepositAddress from their Bitcoin wallet

// 7. Monitor deposit progress
stake.on('progress', (progress) => {
  console.log(`Confirmations: ${progress.confirmations}/${progress.requiredConfirmations}`);
  if (progress.isClaimed) {
    console.log('LBTC minted to recipient!');
  }
});

// Single-shot status check (call repeatedly for polling)
const monitorResult = await stake.monitorDeposit?.();
```

### Resume Flow

If a user has already generated a deposit address in a previous session, `prepare()` detects this automatically. The status will jump to `ADDRESS_READY` and `stake.depositAddress` will be populated.

### Fee Authorization vs Address Confirmation

Check which is needed at runtime:

```typescript
import { requiresAutoMintFee } from '@lombard.finance/sdk';

if (requiresAutoMintFee(ChainId.ethereum)) {
  // EIP-712 fee authorization (signs typed data with minting fee amount)
} else {
  // EIP-191 address confirmation (signs the destination address)
}
```

The `authorize()` method handles both cases internally based on the destination chain.

## BTC.b to LBTC On-Chain Staking (EvmStake)

For users who already hold BTC.b on an EVM chain:

**Status flow (Avalanche, needs approval):**
`IDLE` -> `NEEDS_APPROVAL` -> `READY` -> `COMPLETED`

**Status flow (Ethereum/Sepolia, needs fee auth):**
`IDLE` -> `NEEDS_FEE_AUTHORIZATION` -> `READY` -> `COMPLETED`

**Status flow (Base/BSC, subsidized):**
`IDLE` -> `READY` -> `COMPLETED`

```typescript
import { AssetId, Chain, EvmOperationStatus } from '@lombard.finance/sdk';

const stake = sdk.chain.evm.stake({
  assetIn: AssetId.BTCb,
  assetOut: AssetId.LBTC,
  sourceChain: Chain.AVALANCHE,
  destChain: Chain.AVALANCHE,
});

await stake.prepare({ amount: '0.01' });

// On Avalanche: approve BTC.b spending first
if (stake.needsApproval) {
  await stake.approve();
}

// On Ethereum/Sepolia: authorize the network fee
if (stake.status === EvmOperationStatus.NEEDS_FEE_AUTHORIZATION) {
  await stake.authorizeFee();
}

const { txHash } = await stake.execute();
```

## StakeAndBake: BTC to LBTC to Vault (BtcStakeAndDeploy)

Atomic flow that stakes BTC and deploys the resulting LBTC to a DeFi vault.

**Status flow:**
`IDLE` -> `NEEDS_DEPLOY_AUTHORIZATION` -> `READY` -> `ADDRESS_READY`

```typescript
import { AssetId, Chain, DeployProtocol } from '@lombard.finance/sdk';

const action = sdk.chain.btc.stakeAndDeploy({
  assetOut: AssetId.LBTC,
  destChain: Chain.ETHEREUM,
  protocol: DeployProtocol.Veda,
});

// 1. Prepare
await action.prepare({
  amount: '0.5',
  recipient: '0xAbC...',
});

// 2. Authorize vault deposit (EIP-2612 Permit signature)
if (action.status === BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION) {
  await action.authorizeDeposit();
}

// 3. Generate BTC deposit address
const btcAddress = await action.generateDepositAddress();

// 4. User sends BTC to btcAddress

// 5. Monitor: tracks BTC confirmation, LBTC minting, AND vault deposit
action.on('progress', (progress) => {
  console.log(`Claimed: ${progress.isClaimed}, Deposited: ${progress.isDeposited}`);
});
```

## React Hooks

### useBtcStake

```typescript
import { useBtcStake, useLombardSDK } from '@lombard.finance/sdk-react';
import { createConfig, Env, AssetId, Chain } from '@lombard.finance/sdk';

const { sdk } = useLombardSDK(
  () => createConfig({ env: Env.prod, providers: { evm: () => window.ethereum! } }),
  [env],
);

const { stake, depositAddress, stakeAmount, status, progress, error, isLoading, reset } =
  useBtcStake(sdk);

// Runs full lifecycle: prepare -> authorize -> generateDepositAddress
await stake({
  amount: '0.1',
  recipient: '0x...',
  assetOut: AssetId.LBTC,
  destChain: Chain.ETHEREUM,
});

// status.phase: 'idle' | 'preparing' | 'waiting-deposit' | 'confirming' | 'minting' | 'complete' | 'error'
// progress: { confirmations, requiredConfirmations }
```

### useBtcStakeAndBake

```typescript
import { useBtcStakeAndBake } from '@lombard.finance/sdk-react';
import { DeployProtocol, Chain } from '@lombard.finance/sdk';

const { stakeAndDeploy, depositAddress, status, progress, error, isLoading, reset } =
  useBtcStakeAndBake(sdk);

await stakeAndDeploy({
  amount: '0.5',
  recipient: '0x...',
  destChain: Chain.ETHEREUM,
  protocol: DeployProtocol.Veda,
});

// progress: { confirmations, requiredConfirmations, isDeposited, isClaimed }
```

## Agent Tools

```typescript
import {
  prepareStake,
  getDepositBtcAddress,
  getExchangeRate,
} from '@lombard.finance/sdk-agent';

// Check exchange rate first (LBTC is NOT 1:1 with BTC)
const rate = await getExchangeRate.execute({ chainId: 8453 });
// { lbtcToBtc, btcToLbtc, minStakeAmountBtc, description }

// Get existing BTC deposit address (or instructions to generate one)
const deposit = await getDepositBtcAddress.execute({
  address: '0x...',
  chainId: 8453,
});
// { btcAddress: 'bc1...' | null, chain, note, action? }

// Prepare a BTC.b -> LBTC stake transaction
const stakeTx = await prepareStake.execute({ amount: '0.01', chainId: 8453 });
// { action: 'sign_transaction', type: 'stake', params: {...} }
```

### With Vercel AI SDK

```typescript
import { lombardTools } from '@lombard.finance/sdk-agent/vercel';
import { streamText } from 'ai';

const result = streamText({
  model: yourModel,
  tools: lombardTools,
  messages: [{ role: 'user', content: 'Stake 0.01 BTC.b to LBTC on Base' }],
});
```

## Supported Chains

Query supported chains at runtime rather than hardcoding:

```typescript
import { SUPPORTED_CHAINS } from '@lombard.finance/sdk-agent';
import { requiresAutoMintFee } from '@lombard.finance/sdk';

for (const [chainId, config] of Object.entries(SUPPORTED_CHAINS)) {
  console.log(`${config.name} (${chainId}): env=${config.env}, feeAuth=${requiresAutoMintFee(config.chainId)}`);
}
```

## Error Handling

Errors do NOT change the action status. The status stays at the step where the error occurred. This lets you retry the same method:

```typescript
try {
  await stake.authorize();
} catch (err) {
  // stake.status is still NEEDS_FEE_AUTHORIZATION
  // stake.error has the error details
  // User can retry: await stake.authorize();
}
```
