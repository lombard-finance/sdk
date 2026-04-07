---
name: lbtc-yield-strategies
description: Deploy LBTC into DeFi vaults for additional yield beyond base staking
read_when:
  - user wants to earn more yield on LBTC
  - user asks about DeFi vaults or strategies
  - user wants to deploy LBTC to Veda vault
  - user mentions yield optimization for Bitcoin
  - user asks about vault withdrawal or withdrawal queue
  - user asks about StakeAndBake or stake-and-deploy
requires: []
metadata:
  emoji: "📈"
  sdkVersion: ">=4.4.0"
---

# LBTC Yield Strategies

LBTC earns base staking yield from Babylon automatically through the exchange rate. You can earn additional DeFi yield by deploying LBTC into yield vaults. This skill covers vault discovery, deploying LBTC, the StakeAndBake atomic flow, withdrawals, and position tracking.

## Available Vaults

### Veda Vault

Veda is the primary yield vault for LBTC. It deploys LBTC into curated DeFi strategies for additional yield on top of base Babylon staking rewards.

- **Chains**: Ethereum mainnet (primary)
- **Token**: LBTC
- **Yield**: Base staking yield + DeFi strategy yield
- **Risk**: Smart contract risk of underlying strategies

### Silo Protocol

Available for BTC.b deposits on certain chains (e.g., Avalanche). Uses the `BtcDepositAndDeploy` flow.

## Checking Available Strategies

### Using Agent Tools

```typescript
import { getStrategies } from '@lombard.finance/sdk-agent';

const result = await getStrategies.execute({});
// {
//   strategies: [
//     { vault: 'Veda', chain: 'Ethereum', apy: '4.52%', tvlBtc: '1234.5678' }
//   ]
// }
```

### Using the SDK

```typescript
import { getVaultApy, getVaultTVL, getVaultDeposits, Vault, Env } from '@lombard.finance/sdk';

// Get current APY data (returns historical array)
const apyData = await getVaultApy({ env: Env.prod, vaultKey: Vault.Veda });
const latestApy = apyData[apyData.length - 1];
console.log(`Current APY: ${latestApy.apy.toFixed(2)}%`);

// Get current TVL
const tvlData = await getVaultTVL({ env: Env.prod, vaultKey: Vault.Veda });
console.log(`TVL (BTC): ${tvlData.btcBalance.toFixed(4)}`);

// Get deposits for a specific user
const deposits = await getVaultDeposits({
  account: '0x...',
  chainId: ChainId.ethereum,
  vaultKey: Vault.Veda,
  env: Env.prod,
});
```

## Deploying LBTC to a Vault (EvmDeploy)

The EvmDeploy action handles the full deploy lifecycle including approval.

**Status flow (needs approval):**
`IDLE` -> `NEEDS_APPROVAL` -> `READY` -> `COMPLETED`

**Status flow (already approved):**
`IDLE` -> `READY` -> `COMPLETED`

```typescript
import {
  createLombardSDK,
  AssetId,
  Chain,
  DeployProtocol,
  Env,
} from '@lombard.finance/sdk';

const sdk = await createLombardSDK({
  env: Env.prod,
  providers: { evm: () => window.ethereum },
});

// 1. Create the deploy action
const deploy = sdk.chain.evm.deploy({
  asset: AssetId.LBTC,
  sourceChain: Chain.ETHEREUM,
  protocol: DeployProtocol.Veda,
  recipient: '0xAbC...',
});

// 2. Prepare with amount and protocol
await deploy.prepare({
  amount: '0.5',
  protocol: DeployProtocol.Veda,
});

// 3. Approve LBTC spending if needed
if (deploy.needsApproval) {
  await deploy.approve();
}

// 4. Execute the vault deposit
const { txHash } = await deploy.execute();
console.log(`Deployed to Veda vault: ${txHash}`);
```

## StakeAndBake: BTC to LBTC to Vault (BtcStakeAndDeploy)

Skip the intermediate step. Stake BTC and automatically deploy LBTC to a vault in one atomic operation.

**Status flow:**
`IDLE` -> `NEEDS_DEPLOY_AUTHORIZATION` -> `READY` -> `ADDRESS_READY`

```typescript
import { AssetId, Chain, DeployProtocol, BtcActionStatus } from '@lombard.finance/sdk';

const action = sdk.chain.btc.stakeAndDeploy({
  assetOut: AssetId.LBTC,
  destChain: Chain.ETHEREUM,
  protocol: DeployProtocol.Veda,
});

// 1. Prepare
await action.prepare({
  amount: '0.5',
  recipient: '0xAbC...',
  referralCode: 'ref123', // optional
});

// 2. Authorize vault deposit (EIP-2612 Permit)
if (action.status === BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION) {
  await action.authorizeDeposit(); // triggers wallet signature
}

// 3. Generate BTC deposit address
const btcAddress = await action.generateDepositAddress();

// 4. User sends BTC to btcAddress from their Bitcoin wallet

// 5. Monitor: tracks confirmation, minting, AND vault deposit
action.on('progress', (progress) => {
  console.log(`Confirmations: ${progress.confirmations}/${progress.requiredConfirmations}`);
  console.log(`LBTC claimed: ${progress.isClaimed}`);
  console.log(`Vault deposit: ${progress.isDeposited}`);

  // Steps: created -> verifying -> issuing -> depositing
  console.log('Steps:', progress.steps);
});
```

### BTC.b to Vault: BtcDepositAndDeploy

For protocols that accept BTC.b instead of LBTC (e.g., Silo on Avalanche):

```typescript
const action = sdk.chain.btc.depositAndDeploy({
  assetOut: AssetId.BTCb,
  destChain: Chain.AVALANCHE,
  protocol: DeployProtocol.Silo,
});

await action.prepare({ amount: '0.1', recipient: '0x...' });
await action.authorizeDeposit();
const btcAddress = await action.generateDepositAddress();
```

## Vault Withdrawals (EvmWithdraw)

Withdrawals are queued and processed within the protocol's withdrawal window.

**Status flow (needs approval):**
`IDLE` -> `NEEDS_APPROVAL` -> `READY` -> `COMPLETED`

```typescript
import { DeployProtocol, Chain } from '@lombard.finance/sdk';

// 1. Create withdraw action
const withdraw = sdk.chain.evm.withdraw({
  protocol: DeployProtocol.Veda,
  sourceChain: Chain.ETHEREUM,
  recipient: '0xAbC...',
});

// 2. Prepare with share amount
await withdraw.prepare({ amount: '0.1' }); // vault share amount

// 3. Approve if needed (vault share token spending)
if (withdraw.needsApproval) {
  await withdraw.approve();
}

// 4. Execute queues the withdrawal
const { txHash } = await withdraw.execute();
```

### Cancel a Pending Withdrawal (EvmCancelWithdraw)

```typescript
const cancelWithdraw = sdk.chain.evm.cancelWithdraw({
  protocol: DeployProtocol.Veda,
  chain: Chain.ETHEREUM,
});

await cancelWithdraw.prepare();
const { txHash } = await cancelWithdraw.execute();
```

### Querying Vault Withdrawals

```typescript
// Via API namespace
const withdrawals = await sdk.api.vaultWithdrawals('0x...');
console.log(`Open: ${withdrawals.open.length}`);
console.log(`Fulfilled: ${withdrawals.fulfilled.length}`);
console.log(`Cancelled: ${withdrawals.cancelled.length}`);
console.log(`Expired: ${withdrawals.expired.length}`);

// Filter by chain
const ethOnly = await sdk.api.vaultWithdrawals('0x...', {
  chainId: ChainId.ethereum,
});

// Each withdrawal has: shareAmount, deadline, status
withdrawals.open.forEach(w => {
  console.log(`Amount: ${w.shareAmount.toFixed()}, Deadline: ${new Date(w.deadline * 1000)}`);
});
```

## Position Tracking

### Vault Share Balance

```typescript
import { getSharesByAddress, ChainId, Env, Vault } from '@lombard.finance/sdk';

const shares = await getSharesByAddress({
  address: '0x...',
  chainId: ChainId.ethereum,
  env: Env.prod,
  vaultKey: Vault.Veda,
});
console.log(`Vault shares: ${shares}`);
```

### Share Value (convert shares to underlying)

```typescript
import { getShareValue, Vault } from '@lombard.finance/sdk';

const value = await getShareValue({
  shares: sharesAmount,
  chainId: ChainId.ethereum,
  env: Env.prod,
  vaultKey: Vault.Veda,
});
console.log(`Shares worth: ${value} LBTC`);
```

## React Hook: useBtcStakeAndBake

```typescript
import { useBtcStakeAndBake, useLombardSDK } from '@lombard.finance/sdk-react';
import { DeployProtocol, Chain, createConfig, Env } from '@lombard.finance/sdk';

const { sdk } = useLombardSDK(
  () => createConfig({ env: Env.prod, providers: { evm: () => window.ethereum! } }),
  [env],
);

const { stakeAndDeploy, depositAddress, stakeAmount, status, progress, error, isLoading, reset } =
  useBtcStakeAndBake(sdk);

// Runs full lifecycle: prepare -> authorizeDeposit -> generateDepositAddress
await stakeAndDeploy({
  amount: '0.5',
  recipient: '0x...',
  destChain: Chain.ETHEREUM,
  protocol: DeployProtocol.Veda,
});

// status.phase: 'idle' | 'preparing' | 'authorizing' | 'waiting-deposit' | 'confirming' | 'depositing' | 'complete' | 'error'
// progress: { confirmations, requiredConfirmations, isDeposited, isClaimed }
```

## Agent Tools

```typescript
import { getStrategies, prepareDeployToVault } from '@lombard.finance/sdk-agent';

// List available strategies with APY and TVL
const strategies = await getStrategies.execute({});

// Prepare a vault deployment transaction
const deployTx = await prepareDeployToVault.execute({
  amount: '0.5',
  protocol: 'veda',
  chainId: 1,
});
// {
//   action: 'sign_transaction',
//   type: 'deploy_to_vault',
//   description: 'Deploy 0.5 LBTC to veda vault on Ethereum',
//   params: { amount: '0.5', protocol: 'veda', token: 'LBTC', chainId: 1 },
//   note: 'Deploying to a vault earns additional DeFi yield on top of base staking rewards.'
// }
```

### With Vercel AI SDK

```typescript
import { lombardTools } from '@lombard.finance/sdk-agent/vercel';
import { streamText } from 'ai';

const result = streamText({
  model: yourModel,
  tools: lombardTools,
  messages: [
    { role: 'user', content: 'Show me available yield strategies for my LBTC' },
  ],
});
// Agent calls get_strategies and presents vault options with APY/TVL
```

## Yield Considerations

- **Compounding**: Base staking yield from Babylon accrues automatically in the LBTC exchange rate. Vault yield is additional and compounds differently per strategy.
- **Vault APY is variable**: Displayed APY is historical and changes with market conditions.
- **TVL limits**: Some vaults have capacity limits. Check TVL and deposit caps before deploying large amounts.
- **Withdrawal**: Withdrawing from a vault returns LBTC. You can continue holding for base staking yield or unstake.
- **Vault data is mainnet-only**: Vault APY and TVL queries always use Ethereum mainnet regardless of chain ID.

## Error Handling

All action classes keep the status at the failing step for easy retry:

```typescript
try {
  await deploy.approve();
} catch (err) {
  // deploy.status is still NEEDS_APPROVAL
  // deploy.error has the error details
  // Retry: await deploy.approve();
}
```
