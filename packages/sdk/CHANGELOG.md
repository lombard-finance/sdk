# 3.7.1
* **added monad support**

# 3.7.0

* **added custom signer support for flexible transaction signing:**
  * introduced `SignerAdapter` interface for custom transaction signing logic,
  * `redeemToken` and `unstakeLBTC` now accept either `provider` (legacy) or `signer` (custom) parameter,
  * backward compatible - existing provider-based code continues to work unchanged.
* added `depositToken` function that triggers the deposit method on the LBTC contract,
* replaced `token` parameter of `redeemToken` function with a pair of new parameters `tokenIn` (the token that is being redeemed) and `tokenOut` (the token received after redemption, defaults to `undefined` [**BTC**]),
* introduced `fetchAllPaginated` utility to handle pagination across all endpoints,
* added unified deposits support:
  * introduced `Deposit` interface to unify Direct BTC Deposits and Native Deposits APIs.  
  * added `isNative` flag to distinguish between deposit types.  
  * added fetchers: `fetchDirectDeposits` and `fetchNativeDeposits` (now uses `fetchAllPaginated` internally).
  * added unified `getDepositsByAddress` function to fetch and combine deposits from both APIs.  
  * improved mapping helpers: `mapDirectBtcDeposit` and `mapNativeDeposit` to normalize fields such as `txHash`, `eventIndex`, `amount`, `blockTime`, `fromChainId`, `toChainId`, `toTokenAddress`, `toToken`, `sanctioned`, `claimTxHash`, and `notarizationWaitDur`.  
  * added JSDoc for all deposit types and fetchers.
  * ensured robust error handling: failure of one API does not prevent fetching from the other.
  * renamed `signature` property to `proof`.
* refactored unstakes fetching:
  * `fetchUnstakesByAddress` now uses `fetchAllPaginated` internally,
  * removed `unstakeDate` property from `Unstake` interface,
  * added `blockTime` property to `Unstake` to retain original timestamp,
  * added `isNative` flag to distinguish between unstakes (directly to BTC) and redemptions (to native chain).
  * `fromChainId` and `toChainId` clearly separated; `toChainId` is undefined for BTC unstakes,
  * fully typed JSDoc added for `Unstake`, `UnstakeEntry`, and fetchers,
  * public API `getUnstakesByAddress` added as a wrapper over the fetcher.
* renamed tokens:
  * `Token.NativeLBTC` to `Token.BTCb` (`BTC.b`)
  * `Token.BTCB` to `Token.BTCBinance` (`BTCB` - Binance BTC wrapper)
  * deprecated `Token.BTCK` which will be sunset as soon as the Katana contracts are updated.
* btc.b support
  - katana, megaETH

# 3.6.23

* added Katana chain support to `getBasculeDepositStatus` with proper GMP payload decoding and mintID calculation.

# 3.6.21

* changed sevenseas api requests to proxy through bff

# 3.6.20

* updated LBTC token contract addresses for staging environment.

# 3.6.19

* added Starknet-specific logic for BTC deposit address generation.
* added token contract addresses for Starknet Sepolia.

# 3.6.18

* removed deprecated rewards (BABY) logic,
* introduced `IPointsBase` interface to capture **common fields** shared across all seasons.
* added `IPointsByAddressSeason1` interface for Season 1 specific points:
  * `okxPoints`
  * `flashEvent1Points`
  * `flashEvent2Points`
* added `IPointsByAddressSeason2` interface for Season 2 specific points:
  * `refereePoints`
  * `checkinPoints`
* made `totalWithoutBadgesPoints` optional in the base interface but required in Season 1.
* `getPointsByAddress` function now accepts a `season` parameter (`1 | 2`) and returns the correct typed object based on season.
* added convenience wrappers:
  * `getLuxSeason1Points()` → returns `IPointsByAddressSeason1`
  * `getLuxSeason2Points()` → returns `IPointsByAddressSeason2`
* improved type safety to prevent access to season-specific fields incorrectly.
* default season is now 2 when no `season` is provided.
* updated README.md.

# 3.6.17

* added support for season 2 points - added `season` parameter to the `getPoinstByAddress`.

# 3.6.16

* season 1 points API changes (removed campaign requests, now part of the same API).

# 3.6.15

* added `bob` chain,
* added token contract address on `bob`.

# 3.6.14

* fixed the issue with unused and unpublished dependencies.

# 3.6.13

* added new `token` parameter to the `signStakeAndBake` function,
* by default, `token` is set to `"BTC"`, and the value is automatically converted to LBTC using the current exchange ratio,
* if `token` is explicitly set to `"LBTC"`, the value is used as-is (no conversion).

# 3.6.12

* total points earned by address are taken from the API and not calculated any more.

# 3.6.11

* Add CHANGELOG.md to published package.

# 3.6.10

* `Token.BTCK` is now an alias of `Token.NativeLBTC` (recommended).

# 3.6.9

* fixed issue with getting the deposit address on Sui and Solana networks.

# 3.6.8

* reverted changes from 3.6.6 - the Bascule address has been fixed in the contract.

# 3.6.7

* added new `getMinRedeemAmount` function that return the min redeem amount.

# 3.6.6

* disabled Bascule check for Katana

# 3.6.5

* fixed issue with the LBTC token contract address on Etherlink.

# 3.6.4

* added `getEstimatedApy` function,
* added new `inProgress` field to `PositionsSummary` type of `getPositionsSummary`.

# 3.6.3

* updated rewards API url and schema for `getRewardsInfo`,
* renamed `getRewardsInfo` to `getPositionsSummary`,
* added `getApy` function and remove `apr` from `getLBTCStats`,
* added `getAdditionalRewards` function.

# 3.6.2

* updated rewards API urls for `getRewardsInfo`.

# 3.6.1

* changed configuration for upgraded LBTC and BTCK (Native LBTC) on Tatara chain
  (stage and testnet),
* added auto-detection for upgraded LBTC and BTCK contracts,
* updated redeem fee logic based on the recent ABI changes,
* `getTokenContractInfo` in now an async function,
* refactored the internal `AbiFor` type and upgraded contracts logic,
* added `accountAddress` and `partnerId` params to the `getLBTCStats` function.

# 3.6.0

* `Token.LBTC` ABI changes to `stLBTC` for specified chains: `Sepolia`,
* added new `Token.NativeLBTC`,
* changed `getLBTCMintingFee` and `getMintingFee` so it either takes the value
  from the token contract (old version) or `AssetRouter` contract (new version),
* renamed `getBurningFee` to `getRedeemFee` and refactored it so it takes the
  fee values from the `AssetRouter` or the token contract (old version).

# 3.5.12

* added `tac` chain and bridge eth - tac bridge (OFT).

# 3.5.11

* updated the BFF API urls.

# 3.5.10

* added `token_address` param to generate and get deposit address functions.

# 3.5.9

* changed LBTC addresses for `dev` env.

# 3.5.8

* fixed exports for `getExchangeRatio`

# 3.5.7

* added `getRewardsInfo` function that retrieves the information about earned
  rewards (yield),
* added `apr` to the `getLBTCStats` function,
* added `getExchangeRatio` function that gets the exchange ratios of LBTC:BTC
  and BTC:LBTC.

# 3.5.6

* added support for Katana chain.

# 3.4.0

* bug fixes,
* added `getVaultDeposits` and `getVaultWithdrawals`.

# 3.2.0

* added metrics `getVaultTVL`, `getVaultApy`, `getLBTCStats`.

# 3.1.0

* added function to manually deposit / withdraw to and from the DeFi vault,
* switched to `viem`.
