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
