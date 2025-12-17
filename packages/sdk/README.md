# @lombard.finance/sdk

The Lombard's SDK package provides a set of functions that allow interacting with the Lombard protocol and its features.

Read more about Lombard's mission: https://www.lombard.finance

## Installation

### 1. Dependencies installation

The SDK depends on the following packages:

- axios
- viem@2.23
- bignumber.js@9
- @bitcoinerlab/secp256k1@1.2.0
- bitcoinjs-lib@6.1.5
- @layerzerolabs/lz-v2-utilities@3.0.17

You may install them by running the following command:

```bash
npm i --save viem@^2.23.15 axios@^1 bignumber.js@^9 @bitcoinerlab/secp256k1@1.2.0 bitcoinjs-lib@6.1.5 @layerzerolabs/lz-v2-utilities@3.0.17
```

### 2. SDK installation

To install the SDK package, please run:

```bash
npm i --save @lombard.finance/sdk
```

## Usage

All functions are documented with JSDoc comments. You can use your IDE's autocomplete feature to see the available methods and their parameters.

### 1. Depositing BTC in order to get LBTC (aka staking)

You can read more about LBTC here: [LBTC (Staked Bitcoin)](https://docs.lombard.finance/lbtc-liquid-bitcoin/lbtc-staked-bitcoin)

If you'd like to stake your BTC and get LBTC, follow the steps below.

#### 1.1. Generate the BTC deposit address

Use `signLbtcDestinationAddr` to generate a signature for the destination address and generate the deposit address:

```ts
const signature = await signLbtcDestinationAddr({
  account,
  chainId: ChainId.ethereum,
  provider,
});

let depositBtcAddress = await getDepositBtcAddress({ address, chainId });
if (!depositBtcAddress) {
  depositBtcAddress = await generateDepositBtcAddress({
    address,
    chainId,
    signature,
    partnerId: 'YOUR_PARTNER_ID',
  });
}
```

#### 1.2. Check and store the network fee (if fee > 0)

If the network fee is greater than 0, sign the fee and store the signature so the funds can be auto-minted:

```ts
const fee = await getLBTCMintingFee({ chainId: ChainId.ethereum }); // Fee in satoshis (BigNumber)

if (fee.gt(0)) {
  const expiry = Math.round((Date.now() + 24 * 60 * 60 * 1000) / 1000);
  const { signature, typedData } = await signNetworkFee({
    fee,
    expiry,
    account,
    chainId: ChainId.ethereum,
    provider,
  });

  await storeNetworkFeeSignature({ signature, typedData, address });
}
```

#### 1.3. Depositing

Deposit your BTC to the generated address. Funds will be claimed automatically by Lombard’s claimer and credited to your account (`address`).

If you hold `BTC.b` and want to deposit it to Lombard in order to receive `LBTC`, you can use the `depositToken` function.

```ts
const txHash = await depositToken({
  account: accountAddress, // Your account address
  chainId, // The chain ID
  amount, // Amount of tokens to deposit (human-readable format)
  tokenIn = Token.BTCb, // Input token to deposit (default: `Token.BTCb`)
  tokenOut = Token.LBTC, // Output token to be minted (default: `Token.LBTC`)
  provider, // Instance of an `EIP1193Provider`
  env, // Optional environment setting
  rpcUrl, // Optional RPC endpoint URL
});
```

> **Note**: If you are using the `BTC.b` deposit flow, you can skip generating a BTC deposit address. The `depositToken` function handles the deposit and conversion automatically.

#### 1.4. Check the status of your deposit

Use `getDepositsByAddress` to retrieve all deposits (Direct BTC + Native BTC.b Deposits) in a unified format:

```javascript
const deposits = await getDepositsByAddress({ address });
```

Each deposit entry contains the following properties:

| Property              | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `txHash`              | Transaction hash on the source blockchain.                                  |
| `eventIndex`          | Index of the deposit event within the transaction.                          |
| `amount`              | Amount deposited (satoshis or smallest unit).                               |
| `depositAddress`      | BTC/EVM deposit address (Direct BTC only).                                  |
| `fromAddress`         | Sender address (Native deposits).                                           |
| `toAddress`           | Receiver address on the destination chain (Native deposits).                |
| `toTokenAddress`      | Destination token contract (if applicable).                                 |
| `toToken`.            | Destination token (if applicable).                                          |
| `toChainId`           | Destination chain ID.                                                       |
| `fromChainId`         | Source chain ID (Native deposits).                                          |
| `blockHeight`         | Block height of the confirmation.                                           |
| `blockTime`           | Unix timestamp of confirmation (seconds).                                   |
| `payloadHash`         | Hash of the payload proving the deposit details.                            |
| `rawPayload`          | Hex-encoded raw payload (used for manual claiming).                         |
| `proof`               | Cryptographic proof (hex-encoded).                                          |
| `sessionId`           | Notarization session ID.                                                    |
| `notarizationStatus`  | Deposit notarization status (`pending`, `submitted`, `approved`, `failed`). |
| `sessionState`        | Notarization session state (`pending`, `completed`, `expired`).             |
| `claimTxHash`         | Claim transaction hash if deposit has been claimed.                         |
| `isClaimed`           | Boolean indicating whether the deposit has been claimed.                    |
| `sanctioned`          | Boolean indicating if the deposit is restricted/sanctioned.                 |
| `auxVersion`          | Optional auxiliary version (Direct BTC only).                               |
| `notarizationWaitDur` | Optional notarization wait duration in seconds (Direct BTC only).           |

---

### 2. Minting

If a deposit has not been automatically claimed (e.g., expired signature), you can manually claim LBTC or other supported tokens using `mintToken`.

> **Note**: `mintToken` is the preferred function. `claimLBTC` (available in the SDK) is a convenience wrapper for LBTC.

```ts
const txHash = await mintToken({
  data: rawPayload, // The rawPayload from the notarized deposit.
  proofSignature: deposit.proof, // The proof signature of a notarized deposit.
  account, // The account address/
  chainId, // The chain id.
  provider, // The EIP-1193 provider,
  token: Token.LBTC, // The token to be minted, defaults to `Token.LBTC`
});
```

The successful execution of the above will result with the transaction id.

---

### 3. Depositing BTC and automatically staking LBTC into the DeFi vault

You can read more about the DeFi vaults here: https://docs.lombard.finance/lbtc-liquid-bitcoin/defi-vaults/lombard-defi-vault

If you'd wish to stake and bake your BTC follow the steps below. The SDK currently supports:

- **`DefiProtocol.Veda`** – the Lombard DeFi vault that accepts BTC/LBTC on Ethereum, BNB Chain, and Holesky.
- **`DefiProtocol.Silo`** – the Silo Finance vault (testnet) that accepts BTCb on Avalanche Fuji.

Pick the appropriate `vaultKey` (and token) to match the protocol you're targeting.

#### 3.1. See what's the current stake and bake fee.

To check the current stake and bake fee you may use the following function:

```javascript
const fee = await getStakeAndBakeFee({
  protocol: DefiProtocol.Veda, // The DeFi protocol (Veda or Silo).
  token: Token.LBTC, // Optional: The token to query fee for. Defaults to protocol's primary token.
  chainId, // The chain id.
  env, // Optional: Environment (prod, testnet, etc.).
  rpcUrl, // Optional: RPC url.
});
const expectedLBTCAmount = BigNumber(amountToBeDeposited).minus(fee);
```

**Parameters:**

| Param      | Type                | Required | Description                                                                                        |
| ---------- | ------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `protocol` | `DefiProtocol`      | ❌       | The DeFi protocol identifier. Defaults to `DefiProtocol.Veda`.                                     |
| `token`    | `StakeAndBakeToken` | ❌       | The token to query fee for. If not provided, defaults to the protocol's primary token (see below). |
| `chainId`  | `number`            | ✅       | The target chain ID.                                                                               |
| `env`      | `Env`               | ❌       | Optional environment (prod, testnet, etc.). Defaults to production.                                |
| `rpcUrl`   | `string`            | ❌       | Optional RPC URL override.                                                                         |

**Protocol Default Tokens:**

- `DefiProtocol.Veda` → `Token.LBTC` (also supports `'BTC'`)
- `DefiProtocol.Silo` → `Token.BTCb`

**Example: Query fee for Silo on Avalanche Fuji**

```typescript
const fee = await getStakeAndBakeFee({
  protocol: DefiProtocol.Silo,
  chainId: ChainId.avalancheFuji,
  env: Env.testnet,
  // token defaults to Token.BTCb for Silo
});
```

The fee amount will be deducted from the claimed token automatically during stake and bake.

#### 3.2. Sign the stake and bake signature

```javascript
const { signature, typedData } = await signStakeAndBake({
  account, // The connected account address.
  expiry, // Optional expiration timestamp (unix). Defaults to 24h from now. Recommended: at least 8h from now.
  value, // The amount of the token (see `token` param).
  token, // The token to sign with. Defaults to "BTC": the value is converted to LBTC using the current ratio.
  // If "LBTC" is chosen, no conversion is applied.
  vaultKey: DefiProtocol.Veda, // Choose the DeFi protocol (e.g. Veda or Silo Finance).
  chainId, // The chain ID.
  provider, // The EIP-1193 provider.
  rpcUrl, // Optional RPC URL.
});
```

| Param      | Type                | Required | Description                                                                                                                                                                      |
| ---------- | ------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `account`  | `string`            | ✅       | The connected account address.                                                                                                                                                   |
| `expiry`   | `number`            | ❌       | Optional expiration time (Unix timestamp). Defaults to 24h from now. Recommended: set at least 8h from now.                                                                      |
| `value`    | `string`/`number`   | ✅       | The token amount (interpreted based on the `token` param).                                                                                                                       |
| `token`    | `"BTC"` \| `"LBTC"` | ❌       | The token to sign with. Defaults to `"BTC"`. If `"BTC"`, the amount is converted to LBTC using the current exchange ratio. If `"LBTC"`, the value is used as-is (no conversion). |
| `vaultKey` | `DefiProtocol`      | ❌       | The DeFi protocol identifier. Use `DefiProtocol.Veda` for Lombard's vault or `DefiProtocol.Silo` for the Silo Finance integration.                                               |
| `chainId`  | `number`            | ✅       | The target chain ID.                                                                                                                                                             |
| `provider` | `EIP-1193 provider` | ✅       | The connected Web3 provider.                                                                                                                                                     |
| `rpcUrl`   | `string`            | ❌       | Optional RPC URL override.                                                                                                                                                       |

**Note:**

- If token is `"BTC"`, the function automatically converts the value to the corresponding **LBTC** amount using the current exchange ratio.
- If token is `"LBTC"`, the value is used as-is (no conversion).
- `DefiProtocol.Veda` supports BTC/LBTC stake-and-bake on Ethereum, BSC, and Holesky. `DefiProtocol.Silo` currently targets the Silo Finance vault with BTCb on Avalanche Fuji (testnet) using the approval flow defined in the DeFi registry.

**Example: Silo Finance stake and bake on Avalanche Fuji**

```ts
import {
  ChainId,
  DefiProtocol,
  signStakeAndBake,
  Token,
} from '@lombard.finance/sdk';

const { signature, typedData } = await signStakeAndBake({
  account,
  chainId: ChainId.avalancheFuji,
  provider,
  token: Token.BTCb,
  vaultKey: DefiProtocol.Silo,
  value: '0.5', // BTCb amount in human-readable format
});
```

#### 3.3. Store the signature to the Lombard's systems.

```javascript
await storeStakeAndBakeSignature({
  signature, // Pass here the signature form the previous step.
  typedData, // Pass here the typed data from the previous step.
});
```

It is recommended to verify if the signature has been stored.

```javascript
const data = await getUserStakeAndBakeSignature({
  userDestinationAddress: address,
  chainId,
});
```

#### 3.4. Get or generate the BTC deposit address.

```javascript
let depositBtcAddress = await getDepositBtcAddress({ address, chainId });
if (!depositBtcAddress) {
  depositBtcAddress = await generateDepositBtcAddress({
    address,
    chainId,
    signature, // Pass here the signature from step 2.
    signatureData: typedData, // Pass here the typed data from step 2.
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
  vaultKey: Vault.Veda, // Lombard DeFi vault identifier (stake & bake deposits that land in Veda).
  address, // The account address.
  chainId, // The chain id.
  rpcUrl, // The optional RPC url
});
```

The above code results with:

- `balance` - The amount of LBTCv (Vault shares) shares owned by the account,
- `exchangeRate` - The current LBTCv (Vault shares) to LBTC exchange rate,
- `balanceLbtc` - The value of the owned shares is LBTC.

---

### 4. Redeeming LBTC to BTC or other supported tokens.

Every LBTC is redeemable back to BTC, you can do that programmatically by following the steps:

#### 4.1. Redeeming.

Use `redeemToken` to redeem LBTC → BTC (or other supported flows).
When redeeming to BTC, be sure to pass a valid `btcAddress`.

```javascript
import { redeemToken, Token } from '@lombard.finance/sdk';

// Redeem LBTC into BTC
const txHash = await redeemToken({
  btcAddress, // The BTC address to receive the redeemed funds.
  amount, // Amount of LBTC to redeem (e.g. "1.23").
  account, // Your EVM account address.
  chainId, // The chain ID where LBTC is deployed.
  provider, // The EIP-1193 provider (e.g. from MetaMask).
  rpcUrl, // (Optional) Custom RPC URL.
  tokenIn: Token.LBTC, // The token you are redeeming.
});

// Redeem LBTC into BTC.b
const txHash = await redeemToken({
  amount, // Amount of LBTC to redeem (e.g. "1.23")
  account, // Your EVM account address
  chainId, // The chain ID where LBTC is deployed
  provider, // The EIP-1193 provider (e.g. from MetaMask)
  rpcUrl, // (Optional) Custom RPC URL
  tokenIn: Token.LBTC, // The token you are redeeming
  tokenOut: Token.BTCb, // The token to receive
});
```

#### 4.3. Check the status of your redemptions (unstakes).

If you'd like to get the list of all unstaked made by an address, use this:

```javascript
const unstakes = await getUnstakesByAddress({ address });
```

Every entry in the result of the above may consist of:

| Field              | Type                                              | Description                                                                                                            |
| ------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **isNative**       | `boolean`                                         | `true` if the record originates from a **native-chain redemption** (e.g. BTC.b), `false` if it’s a direct BTC unstake. |
| **txHash**         | `string`                                          | Transaction hash of the unstake/redemption on the source chain.                                                        |
| **fromChainId**    | `ChainId \| SuiChain \| SolanaChain`              | Identifier of the **source chain** where the unstake was initiated.                                                    |
| **toChainId**      | `ChainId \| SuiChain \| SolanaChain` _(optional)_ | Destination chain identifier (undefined for BTC unstakes).                                                             |
| **blockHeight**    | `number`                                          | Block height on the source chain where the unstake was confirmed.                                                      |
| **blockTime**      | `number` (epoch seconds)                          | Timestamp (in epoch seconds) of the confirmation block.                                                                |
| **fromAddress**    | `string`                                          | Address of the initiator of the unstake transaction.                                                                   |
| **toAddress**      | `string` _(optional)_                             | Destination address receiving the redeemed funds (BTC, EVM, or Solana).                                                |
| **amount**         | `BigNumber`                                       | Amount unstaked, normalized to **satoshis / smallest unit**.                                                           |
| **payoutTxHash**   | `string` _(optional)_                             | Transaction hash of the payout on the **destination chain**, if the claim/payout has occurred.                         |
| **payoutTxIndex**  | `number` _(optional)_                             | Transaction index of the payout within the destination block, if applicable.                                           |
| **payoutTxStatus** | `PayoutTxStatus`                                  | Current status of the payout transaction (e.g. _pending_, _confirmed_, _failed_).                                      |
| **sanctioned**     | `boolean` _(optional)_                            | `true` if the unstake transaction has been sanctioned or flagged.                                                      |

---

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

- `txHash` - the transaction hash,
- `blockNumber` - the transaction's block number,
- `chainId` - the chain id,
- `amount` - the deposited amount,
- `shareAmount` - the amount of shares received,
- `token` - the deposit token.

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

- `balance` - balance of LBTCv (Vault shares),
- `exchangeRate` - the current exchange rate between (Vault shares) and LBTC,
- `balanceLbtc` - the value of LBTCv (Vault shares) represented in LBTC.

---

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

- `token` - the withdrawal token (LBTC),
- `shareAmount` - the amount of shares withdrawn,
- `amount` - the amount of funds withdrawn,
- `minPrice` - the min price of a share,
- `deadline` - the expiration timestamp,
- `timestamp` - the request timestamp,
- `txHash` - the withdraw request transaction hash,
- `blockNumber` - the request block number,
- `fulfilledTimestamp` - the fulfilment timestamp,
- `fulfilledTxHash` - the funds transfer transaction hash,
- `fulfilledBlockNumber` - the fulfilment block number.

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

---

### 7. Getting the points earned by an address

You can check the amount of Lux points earned by an address with:

```ts
import { getLuxSeason2Points } from '@lombard.finance/sdk';
const points = await getLuxSeason2Points({ address: '0x...YOUR_ADDRESS' });
```

#### Returned Object

```ts
{
  /** Points earned by holding LBTC. */
  holdingPoints: number;
  /** Points earned by taking positions in DeFi vaults. */
  protocolPoints: number;
  /** Points earned from referrals. */
  referralPoints: number;
  /** Points earned from referees. */
  refereePoints: number;
  /** Points earned by checking in. */
  checkinPoints: number;
  /** Total points earned. */
  totalPoints: number;
  /** Breakdown of points earned from each protocol. */
  protocolPointsBreakdown: IProtocolPointsBreakdown;
  /** Lux points earned from badges. */
  badgesPoints: number;
  /** Total Lux points excluding badge points (same as total in Season 2). */
  totalWithoutBadgesPoints: number;
}
```

---

### 8. Getting the DeFi vault points earned by an address.

```javascript
const {
  totalPoints, // The total points earned in the DeFi vault.
  pointsBreakdown, // The points breakdown by network (chain).
} = await getVaultPoints({
  account, // The account address.
  vaultKey, // The optional vault identifier.
});
```

---

### 9. Metrics

#### 9.1. Getting the vault's TVL

The vault's TVL can be obtained by calling the `getVaultTVL` function.

```javascript
const data = await getVaultTVL({ vaultKey: Vault.Veda });
```

The above returns:

- `btcBalance` - the amount of BTC locked into the vault,
- `btcPrice` - the current price of BTC,
- `tvl` - the amount of USD locked into the vault.

#### 9.2. Getting the vault's performance data.

The performance of the vault can be checked via the `getVaultApy` function.
As in the example below:

```javascript
const APYs = await getVaultApy({
  aggregationPeriod: 7, // The aggregation period in days, only 7, 14, and 30 are allowed.
  chainId: ChainId.ethereum, // The vault's chain - can be omitted, defaults to `Ethereum`.
  vaultKey: Vault.Veda, // The vault identifier - can be omitted, default to `Vault.Veda`
});
```

The above returns an array of APY entries sorted in descending order (newest first).
Each entry contains:

- `apy` - the APY value,
- `allocations` - the record of general allocations in protocols used by the vault,
- `breakdown` - the detailed record of allocations and APY values broken down by chain and protocol,
- `timestamp` - the timestamp of the entry.

#### 9.3. Getting the LBTC statistics.

The simple set of LBTC statistics is accessible via `getLBTCStats` function.

```javascript
const stats = await getLBTCStats({
  accountAddress, // The (optional) account address - passing the accountAddress ensures the relevant stats are returned
  partnerId, // The (optional) partner id - passing the partnerId will ensures the relevant stats are returned
  env, // The optional environment flag
});
```

The stats contain:

- `historicalHolders` - the number of all-time LBTC holders,
- `holders` - the number of current LBTC holders,
- `price` - the current BTC price,
- `supply` - the number of LBTC minted,
- `tvl` - the Lombard's TVL in USD.

#### 9.4. Getting the LBTC exchange ratio.

LBTC is a yield-bearing token and its exchange rate to BTC is not guaranteed to be 1:1.

In order to check the current exchange rate use:

```javascript
const ratioData = await getExchangeRatio();

// returns:
//
// ratioData = {
//     [Token.LBTC]: {
//         tokenBTCRatio: BigNumber(1)
//         BTCTokenRatio: BigNumber(1)
//     }
// }
```

The result of the above function is an object which contains:

- `tokenBTCRatio` - The Token:BTC ratio answering the question of how many tokens will I get for 1 BTC.
- `BTCTokenRatio` - The BTC:Token ratio (1 / tokenBTCRatio) answering the question of how many BTC will I get for 1 Token.

#### 9.5. Getting the positions (yield) summary

The information about the yield acquired by an account can be obtained via the `getPositionsSummary` function as shown below:

```javascript
const rewardsInfo = await getPositionsSummary({
  account, // The account address
  env, // Optional env flag
});
```

The results of the above includes:

- **`btcPrice: { price: BigNumber; timestamp: Date; }`**  
  Contains the current price of BTC in USD and the time it was last fetched.
  - **`price`** (`BigNumber`): The price of 1 BTC in USD.
  - **`timestamp`** (`Date`): The timestamp when the price was last updated.
- **`btcValue: BigNumber`**  
  The total value of all holdings, expressed in BTC.
- **`btcPnl: BigNumber`**  
  The total profit or loss across all positions, represented in BTC.
- **`snapshot: Array<{ token, type, balance, pnl, rate }>`**  
  A list of individual positions used in PnL calculations. Each entry includes:
  - **`token`** (`Token | undefined`): The token associated with the position (e.g., `Token.LBTC`). May be `undefined` if unspecified.
  - **`type`** (`PositionType`): The classification or source of the position (e.g., staking, trading).
  - **`balance`** (`BigNumber`): The quantity of the token held.
  - **`pnl`** (`BigNumber`): The profit or loss for this specific position, in BTC.
  - **`rate`** (`BigNumber`): The conversion rate from token to BTC.  
    _Formula: `balance * rate = BTC equivalent`_
- **`lastUpdated: Date`**  
  The timestamp when the position summary was last updated.
- **`inProgress: boolean`**
  Indicates whether the backend is currently processing the PnL calculation.
  - `true`: A new calculation request was received, but the backend is experiencing high load
    or processing is not yet complete. The latest data is not yet available.
  - `false`: The most recent calculation has been completed and cached.
    Use `lastUpdated` to understand how fresh the data is:
    - If `lastUpdated` is recent (e.g., within the last few seconds), you're seeing the latest data.
    - If `lastUpdated` is up to 30 minutes old, you're seeing cached data from a recent request.
      The backend avoids recalculating within this caching window.

#### 9.6. Getting the LBTC APY

To retrieve the current APY (annual percentage yield) for LBTC, call this function:

```javascript
const apy = await getApy({
  account, // The optional account address. Pass it for more accurate APY data.
  env, // Optional env flag
});
```

The above returns:

- **`baseApy: BigNumber`**  
  The base APY for LBTC, representing the nominal yield without any bonuses or adjustments.
- **`effectiveApy: BigNumber`**  
  The effective APY for LBTC, including any additional rewards, compounding effects, or protocol-specific incentives.

To retrieve the estimated APY (annual percentage yield) for LBTC in the context of a specific partner integration, use the `getEstimatedApy` function:

```javascript
const estimated = await getEstimatedApy({
  partnerId, // Optional partner identifier. Influences the estimated APY.
  env, // Optional env flag
});
```

The above returns:

- **`estimatedApy: BigNumber`**
  The estimated APY for LBTC, taking into account partner-specific incentives, compounding assumptions, and projected rewards. This value may differ from the effective APY depending on the partner context.

> **Note**: If no `partnerId` is provided, the function returns a default estimate based on global assumptions.

#### 9.7. Getting the additional rewards data

In order to retrieve the additional rewards that have been distributed or are pending use the below function:

```javascript
const rewards = await getAdditionalRewards({
  account,
  env,
});
```

The above returns:

- **`distributed: Array<{ name: string; amount: BigNumber }>`**  
  A list of campaigns where BTC rewards have already been distributed.
  - **`name`** (`string`): Name of the reward campaign.
  - **`amount`** (`BigNumber`): Amount of BTC distributed for the campaign.

- **`undistributed: Array<{ name: string; amount: BigNumber }>`**  
  A list of campaigns where BTC rewards are still pending distribution.
  - **`name`** (`string`): Name of the reward campaign.
  - **`amount`** (`BigNumber`): Amount of BTC yet to be distributed.

---
