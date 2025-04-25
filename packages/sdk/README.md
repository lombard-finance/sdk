# @lombard.finance/sdk

The Lombard's SDK package provides a set of functions that allow interacting with the Lombard protocol and its features.

Read more about Lombard's mission: https://www.lombard.finance

# Table of Contents

[Installation](#installation)

  1. [Dependencies installation](#1-dependencies-installation)

  2. [SDK installation](#2-sdk-installation)

[Usage](#usage)

  1. [Depositing BTC in order to get LBTC (aka staking)](#1-depositing-btc-in-order-to-get-lbtc-aka-staking)

     1.1. [Get the current minting fee](#11-get-the-current-minting-fee)

     1.2. [Sign the network fee signature](#12-sign-the-network-fee-signature)

     1.3. [Store the signature to the Lombard's systems](#13-store-the-signature-to-the-lombards-systems)

     1.4. [Get or generate the BTC deposit address](#14-get-or-generate-the-btc-deposit-address)

     1.5. [Deposit BTC to the address](#15-deposit-btc-to-the-address)

     1.6. [Check the status of your deposit](#16-check-the-status-of-your-deposit)

  2. [Manually claiming LBTC](#2-manually-claiming-lbtc)

  3. [Depositing BTC and automatically staking LBTC into the DeFi vault (aka stake and bake)](#3-depositing-btc-and-automatically-staking-lbtc-into-the-defi-vault-aka-stake-and-bake)

     3.1. [See what's the current stake and bake fee](#31-see-whats-the-current-stake-and-bake-fee)

     3.2. [Sign the stake and bake signature](#32-sign-the-stake-and-bake-signature)

     3.3. [Store the signature to the Lombard's systems](#33-store-the-signature-to-the-lombards-systems)

     3.4. [Get or generate the BTC deposit address](#34-get-or-generate-the-btc-deposit-address)

     3.5. [Deposit BTC to the address](#35-deposit-btc-to-the-address)

     3.6. [Check the status of your deposit](#36-check-the-status-of-your-deposit)

     3.7. [Check the amount of shares acquired](#37-check-the-amount-of-shares-acquired)

  4. [Unstaking LBTC and getting BTC back](#4-unstaking-lbtc-and-getting-btc-back)

     4.1. [Unstake LBTC](#41-unstake-lbtc)

     4.2. [Check the status of your unstakes](#42-check-the-status-of-your-unstakes)

  5. [Depositing LBTC to the DeFi vault](#5-depositing-lbtc-to-the-defi-vault)

     5.1. [Making a deposit to the DeFi vault](#51-making-a-deposit-to-the-defi-vault)

     5.2. [Checking the deposit history](#52-checking-the-deposit-history)

     5.3. [Checking the user's DeFi vault balance](#53-checking-the-users-defi-vault-balance)

  6. [Withdrawing LBTC from the DeFi vault](#6-withdrawing-lbtc-from-the-defi-vault)

     6.1. [Requesting a withdrawal from the DeFi vault](#61-requesting-a-withdrawal-from-the-defi-vault)

     6.2. [Checking the withdrawal history (tracking the withdrawal request)](#62-checking-the-withdrawal-history-tracking-the-withdrawal-request)

     6.3. [Cancelling the withdrawal](#63-cancelling-the-withdrawal)

  7. [Getting the points earned by an address](#7-getting-the-points-earned-by-an-address)

  8. [Getting the DeFi vault points earned by an address](#8-getting-the-defi-vault-points-earned-by-an-address)

  9. [Claiming rewards](#9-claiming-rewards)  

     9.1. [Checking reward balances](#91-checking-reward-balances)  

     9.2. [Claiming rewards](#92-claiming-rewards)  

     9.3. [Checking the reward withdrawal fee](#93-checking-the-reward-withdrawal-fee)  

     9.4. [Getting the withdrawal history (checking withdrawal status)](#94-getting-the-withdrawal-history-checking-withdrawal-status)

  10. [Metrics](#10-metrics)

      10.1. [Getting the vault's TVL](#101-getting-the-vaults-tvl)

      10.2. [Getting the vault's performance data](#102-getting-the-vaults-performance-data)
      
      10.3. [Getting the LBTC statistics](#103-getting-the-lbtc-statistics)



## Installation

### 1. Dependencies installation

The SDK depends on the following packages:
* axios
* viem@2.23
* bignumber.js@9
* bitcoinjs-lib@6.1.5
* @bitcoin-js/tiny-secp256k1-asmjs@2.2.3
* @layerzerolabs/lz-v2-utilities@3.0.17

You may install them by running the following command:

```bash
npm i --save viem@^2.23.15 axios@^1 bignumber.js@^9 @bitcoin-js/tiny-secp256k1-asmjs@2.2.3 bitcoinjs-lib@6.1.5 @layerzerolabs/lz-v2-utilities@3.0.17
```

### 2. SDK installation

To install the SDK package, please run:

```bash
npm i --save @lombard.finance/sdk
```

## Usage

All functions are documented with JSDoc comments. You can use your IDE's autocomplete feature to see the available methods and their parameters.

### 1. Depositing BTC in order to get LBTC (aka staking).

You can read more about LBTC here: https://docs.lombard.finance/lbtc-liquid-bitcoin/introduction-to-lbtc

If you'd wish to stake your BTC and get LBTC follow the below steps:

#### 1.1 Get the current minting fee.

```javascript
const fee = await getLBTCMintingFee({ chainId: ChainId.ethereum }); // The fee represented in satoshis (BigNumber)
```

#### 1.2. Sign the network fee signature.

```javascript
const expiry = Math.round((Date.now() + 24 * 60 * 60 * 1000) / 1000);
const { signature, typedData } = await signNetworkFee({
  fee, // The fee from step 1
  expiry, // The optional expiration unix timestamp. This parameter can be omitted, it default to 24h from now. We recommend to set this to at least 8h from now.
  account, // The destination account address from the connected wallet.
  chainId: ChainId.ethereum // The destination chain id.
  provider, // The EIP-1193 provider, e.g. the injected provider: window.ethereum
});
```

#### 1.3. Store the signature to the Lombard's systems.

```javascript
await storeNetworkFeeSignature({ signature, typedData, address }); // Pass the signature and typed data from step 2.
```

It is recommended to verify that the signature has been stored. Please use `getNetworkFeeSignature`.

```javascript
const { expirationData, hasSignature, isDelayed } = await getNetworkFeeSignature({ address, chainId });
```

`isDelayed` is a flag determining whether the execution of auto-claimer using the stored signature is delayed due to the higher gas costs.

#### 1.4. Get or generate the BTC deposit address.

```javascript
let depositBtcAddress = await getDepositBtcAddress({ address, chainId });
if (!depositBtcAddress) {
  depositBtcAddress = await generateDepositBtcAddress({ 
    address,
    chainId,
    signature, // Pass here the signature from step 2.
    eip712Data: typedData // Pass here the typed data from step 2.
  });
}
```

#### 1.5. Deposit BTC to the address.

Now you can deposit your BTC to the generated in the previous step BTC address.
The funds will be claimed automatically by Lombard's claimer and transferred to
the account (`address`).

#### 1.6. Check the status of your deposit.

If you'd like to check the status of your deposit use `getDepositsByAddress` function.

```javascript
const deposits = await getDepositsByAddress({ address });
```

Every entry in the result of the above function may consist of the following properties:
* `txid` - the BTC transaction id,
* `index` - the index of the actual deposit transaction,
* `blockHeight`
* `blockTime`
* `value` - the amount of BTC deposited,
* `address` - the destination address,
* `chainId` - the destination chain id,
* `isClaimer` - a flag determining whether the deposit has been already claimed,
* `claimedTxId` - the corresponding claim transaction that transfer funds to the destination address,
* `rawPayload` - the payload of the transaction (can be use to claim the funds manually),
* `signature` - the signature used (can be used to claim the funds manually),
* `isRestricted` - a flag determining whether the transaction has been marked as suspicious/restricted,
* `payload` - the payload (corresponding to the Bascule drawbridge security),
* `sessionId`
* `notarizationStatus` - the notarization status of the deposit (pending, submitted, approved or failed),
* `sessionState` - the state of the session (pending, completed, expired)

### 2. Manually claiming LBTC.

In case when a user deposited BTC to the BTC deposit address but the transaction has not been claimed automatically (due to expired signature or any other issue), you may want to claim LBTC manually as in the example below:

```javascript
const txHash = await claimLBTC({
  data: rawPayload, // Pass the raw payload from the deposit data as presented in the previous step.
  proofSignature: signature, // Pass the signature from the deposit data.
  account, // The connected account address
  chainId, // The chain id
  provider, // The EIP-1193 provider,
  rpcUrl, // The optional RPC url.
})
```

The successful execution of the above will result with the transaction id.

### 3. Depositing BTC and automatically staking LBTC into the DeFi vault (aka stake and bake)

You can read more about the DeFi vaults here: https://docs.lombard.finance/lbtc-liquid-bitcoin/defi-vaults/lombard-defi-vault

If you'd wish to stake and bake your BTC follow the steps below.

#### 3.1. See what's the current stake and bake fee.

To check the current stake and bake fee you may use the following function:

```javascript
const fee = await getStakeAndBakeFee({
  vaultKey: Vault.Veda, // The vault identifier, currently only "veda" is accepted.
  chainId, // The chain id.
  rpcUrl, // The options RPC url.
});
const expectedLBTCAmount = BigNumber(amountToBeDeposited).minus(fee);
```
The fee amount will be deducted from the claimed LBTC automatically.

#### 3.2. Sign the stake and bake signature.

```javascript
const { signature, typedData } = await signStakeAndBake({
  account, // The connected account address,
  expiry, // The optional expiration unix timestamp. This parameter can be omitted, it default to 24h from now. We recommend to set this to at least 8h from now.
  value, // The amount of BTC (in satoshis)
  vaultKey: Vault.Veda, // The vault identifier, currently only "veda" is accepted.
  chainId, // The chain id.
  provider, // The EIP-1193 provider.
  rpcUrl, // The optional RPC url.
})
```

#### 3.3. Store the signature to the Lombard's systems.

```javascript
await storeStakeAndBakeSignature({
  signature, // Pass here the signature form the previous step.
  typedData, // Pass here the typed data from the previous step.
})
```

It is recommended to verify if the signature has been stored.

```javascript
const data = await getUserStakeAndBakeSignature({
  userDestinationAddress: address,
  chainId,
})
```

#### 3.4. Get or generate the BTC deposit address.

```javascript
let depositBtcAddress = await getDepositBtcAddress({ address, chainId });
if (!depositBtcAddress) {
  depositBtcAddress = await generateDepositBtcAddress({ 
    address,
    chainId,
    signature, // Pass here the signature from step 2.
    signatureData: typedData // Pass here the typed data from step 2.
  });
}
```

#### 3.5. Deposit BTC to the address. 

Now you can deposit your BTC to the BTC deposit address from above. The funds will be automatically claimed and deposited to the DeFi vault.

#### 3.6. Check the status of you deposit

```javascript
const deposits = await getDepositsByAddress({ address });
```

#### 3.7. Check the amount of shares acquired.

```javascript
const { balance, exchangeRate, balanceLbtc } = await getSharesByAddress({
  vaultKey: Vault.Veda, // The vault identifier.
  address, // The account address.
  chainId, // The chain id.
  rpcUrl, // The optional RPC url
});
```

The above code results with:
* `balance` - The amount of LBTCv shares owned by the account,
* `exchangeRate` - The current LBTCv to LBTC exchange rate,
* `balanceLbtc` - The value of the owned shares is LBTC.

### 4. Unstaking LBTC and getting BTC back.

Every LBTC is redeemable back to BTC, you can do that programmatically by following the steps:

#### 4.1. Unstake LBTC.

```javascript
const txaHash = await unstakeLBTC({
  btcAddress, // The address to which the funds will be redeemed.
  amount, // The amount of LBTC to unstake.
  account, // The account address.
  chainId, // The chain id.
  provider, // The EIP-1193 provider.
  rpcUrl, // The optional RPC url.
});
```

#### 4.2. Check the status of your unstakes.

If you'd like to get the list of all unstaked made by an address, use this:

```javascript
const unstakes = await getUnstakesByAddress({ address });
```

Every entry in the result of the above may consist of:
* `txHash` - The unstake transaction hash,
* `chainId`,
* `blockHeight`,
* `unstakeDate`,
* `fromAddress` - The EVM source address,
* `toAddress` - The BTC destination address of the funds,
* `amount` - The amount unstaked,
* `payoutTxHash` - The BTC transaction hash,
* `payoutTxIndex` - The index of the actual payout transfer,
* `sanctioned` - A flag indicating whether the unstake transaction has been sanctioned and flagged as suspicious.

### 5. Depositing LBTC to the DeFi vault.

If a user already has LBTC depositing to the DeFi vault can be done via the `deposit` function.

#### 5.1. Making a deposit to the DeFi vault.

```javascript
const txHash = await deposit({
  amount, // The deposit amount, e.g. 1.23 (LBTC)
  approve = true, // The optional flag determining whether approval should be done within deposit execution.
  token = 'LBTC', // The optional deposit token.
  vaultKey = Vault.Veda, // The optional vault identifier.
  account, // The account address.
  chainId, // The chain id.
  provider, // The EIP-1193 provider
  rpcUrl, // The optional RPC url
})
```

#### 5.2. Checking the deposit history.

```javascript
const deposits = await getVaultDeposits({
  account, // The account address.
  chainId, // The chain id.
  vaultKey = Vault.Veda // The optional vault identifier.
});
```

The above function returns an array of deposit data made by the specified user.
Each entry contains:
* `txHash` -  the transaction hash,
* `blockNumber` -    the transaction's block number,
* `chainId` -    the chain id,
* `amount` -    the deposited amount,
* `shareAmount` -    the amount of shares received,
* `token` - the deposit token.

#### 5.3. Checking the user's DeFi vault balance.

In order to check the user's balance of the vault tokens, use this:

```javascript
const { balance, exchangeRate, balanceLbtc } = await getSharesByAddress({
  vaultKey: Vault.Veda, // The vault identifier.
  address, // The account address.
  chainId, // The chain id.
  rpcUrl, // The optional RPC url
});
```

The above function returns the:
* `balance` - balance of LBTCv,
* `exchangeRate` - the current exchange rate between LBTCv and LBTC,
* `balanceLbtc` - the value of LBTCv represented in LBTC.

### 6. Withdrawing LBTC from the DeFi vault.

#### 6.1. Requesting a withdrawal from the DeFi vault

Requesting a withdrawal from the DeFi vault can be done via:
```javascript
const txHash = await withdraw({
  amount, // The amount of shares.
  approve = true, // The optional flag determining if approve action should be done within this execution.
  token = 'LBTC', // The optional withdraw token.
  vaultKey = Vault.Veda, // The optional vault identifier.
  account, // The account address.
  chainId, // The chain id.
  provider, // The EIP-1192 provider.
  rpcUrl, // The optional RPC url
})
```

#### 6.2. Checking the withdrawal history (tracking the withdrawal request)

In order to check the whole history or to track the particular withdrawal please use the following function:

```javascript
const withdrawals = await getVaultWithdrawals({
  account, // The account address.
  chainId, // The chain id.
  vaultKey = Vault.Veda, // The optional vault identifier.
  rpcUrl, // The optional RPC url
})
```

The result of the above is an object with broken down withdrawals by their state:
```javascript
{
  cancelled: [...], // The cancelled requests.
  expired: [...], // The requests that expired.
  fulfilled: [...], // The fulfilled requests (funds were transferred).
  open: [...], // The open withdrawal requests (still to be processed).
}
```

Each of the arrays from above consist of:
* `token` - the withdrawal token (LBTC),
* `shareAmount` - the amount of shares withdrawn,
* `amount` - the amount of funds withdrawn,
* `minPrice` - the min price of a share,
* `deadline` - the expiration timestamp,
* `timestamp` - the request timestamp,
* `txHash` - the withdraw request transaction hash,
* `blockNumber` - the request block number,
* `fulfilledTimestamp` - the fulfilment timestamp,
* `fulfilledTxHash` - the funds transfer transaction hash,
* `fulfilledBlockNumber` - the fulfilment block number.

#### 6.3. Cancelling the withdrawal

If you wish to cancel you open withdrawal request use this:

```javascript
const txHash = await cancelWithdraw({
  token = 'LBTC', // The optional withdrawal asset.
  vaultKey = Vault.Veda, // The optional vault identifier.
  account, // The account address.
  chainId, // The chain id.
  provider, // The EIP-1193 provider.
  rpcUrl, // The optional RPC url.
});
```

### 7. Getting the points earned by an address.

If you'd like to check the amount of LUX points earned by an address then simply run the following function:

```javascript
const points = await getPointsByAddress({ address: "0x...YOUR_ADDRESS" })
```

The function returns the object of shape:
```typescript
  {
    /**
     * The number of points earned by holding LBTC.
     */
    holdingPoints: number;
    /**
     * The number of points earned by taking positions in DeFi vaults.
     */
    protocolPoints: number;
    /**
     * The number of points earned by your referrals.
     */
    referralPoints: number;
    /**
     * The number of points earned in the OKX campaign.
     */
    okxPoints: number;
    /**
     * The number of points earned by participating in the flash events.
     */
    flashEventPoints: number;
    /**
     * The total number of points.
     */
    totalPoints: number;
    /**
     * The breakdown of points earned from each protocol.
     */
    protocolPointsBreakdown: IProtocolPointsBreakdown;
  }
```

### 8. Getting the DeFi vault points earned by an address.

```javascript
const { 
  totalPoints, // The total points earned in the DeFi vault.
  pointsBreakdown // The points breakdown by network (chain).
} = await getVaultPoints({
  account, // The account address.
  vaultKey // The optional vault identifier.
})
```

### 9. Claiming rewards.

#### 9.1. Checking reward balances.

```javascript
const rewards = await getRewardBalances({
  address,
  rewardToken: RewardToken.BABY
});
```

The data returned by the above function contains:

* `address` - the address of the reward earner (claimer),
* `availableBalance` - the available balance of the reward token (ready to be withdrawn),
* `lockedBalance` - the locked balance (in processing),
* `pendingBalance` - the pending balance to be credited,
* `rewardToken` - the reward token,
* `timestamp` - the timestamp.

#### 9.2. Claiming rewards.

```javascript
const withdrawal = await claimReward({
  account, // The account address.
  rewardToken, // The reward token, e.g. RewardToken.BABY
  amount, // The amount to be claimed (withdrawn)
  to, // The destination address, e.g. BABYLON chain address.
  chainId, // The chain id
  provider, // The EIP-1193 provider.
});
```

The function will ask a user to sign a message that consists of the amount, destination address and also a withdrawal fee and after obtaining this signature it will request a reward withdrawal from the pool to the provided destination address.

The function returns the `RewardWithdrawal` object.

#### 9.3. Checking the reward withdrawal fee.

```javascript
const withdrawalFee = await getRewardWithdrawalFee({ address, rewardToken });
```

#### 9.4. Getting the withdrawal history (checking withdrawal status).

```javascript
const withdrawals = await getRewardWithdrawals({ address })
```

The function returns an array of:

* `amount` - the withdrawn (claimed) amount of rewards token,
* `rewardToken` - the reward token,
* `fee` - the applied withdrawal fee,
* `to` - the destination address,
* `signature` - the signature used,
* `status` - the withdrawal status,
* `estimatedTimeSent` - the estimated time when the funds are sent,
* `timestamp` - the timestamp.

### 10. Metrics

#### 10.1. Getting the vault's TVL

The vault's TVL can be obtained by calling the `getVaultTVL` function.

```javascript
const data = await getVaultTVL({ vaultKey: Vault.Veda });
```

The above returns:
* `btcBalance` - the amount of BTC locked into the vault,
* `btcPrice` - the current price of BTC,
* `tvl` - the amount of USD locked into the vault.

#### 10.2. Getting the vault's performance data.

The performance of the vault can be checked via the `getVaultApy` function.
As in the example below:

```javascript
const APYs = await getVaultApy({
  aggregationPeriod: 7, // The aggregation period in days, only 7, 14, and 30 are allowed.
  chainId: ChainId.ethereum, // The vault's chain - can be omitted, defaults to `Ethereum`.
  vaultKey: Vault.Veda // The vault identifier - can be omitted, default to `Vault.Veda`
});
```

The above returns an array of APY entries sorted in descending order (newest first).
Each entry contains:

* `apy` - the APY value,
* `allocations` - the record of general allocations in protocols used by the vault,
* `breakdown` - the detailed record of allocations and APY values broken down by chain and protocol,
* `timestamp` - the timestamp of the entry.

#### 10.3. Getting the LBTC statistics.

The simple set of LBTC statistics is accessible via `getLBTCStats` function.

The stats contain:

* `historicalHolders` - the number of all-time LBTC holders,
* `holders` - the number of current LBTC holders,
* `price` - the current BTC price,
* `supply` - the number of LBTC minted,
* `tvl` - the Lombard's TVL in USD.
