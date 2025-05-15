# @lombard.finance/sdk-sui

The Lombard's SDK SUI package provides a set of functions that allow interacting with the Lombard protocol and its features on SUI.

## Installation

```bash
npm install @lombard.finance/sdk @lombard.finance/sdk-sui
```

## Usage

### Generating a BTC deposit address

Similar to the EVM SDK (`@lombard.finance/sdk`) the generation of the deposit address requires a signature.
To successfully generate a deposit address run `signLbtcDestinationAddrSui` and then use the generated signature as a parameter of the EVM SDK's `generateDepositBtcAddress`.

```javascript

const { signature } = await signLbtcDestinationAddrSui({
    // The Sui chain id
    chainId: SUI_MAINNET_CHAIN,
    // The Sui wallet provider, see `@wallet-standard/base`
    wallet,
    // The wallet account, see `@wallet-standard/core`
    account,
});

const depositAddress = await generateDepositBtcAddress({
    // The connected address
    address,
    // The chosen Solana chain (network) - prefixed with `solana:`
    chainId: SUI_MAINNET_CHAIN,
    // The generated signature:
    signature,
    // Optional env
    env: Env.prod,
    // Optional partnerId
    partnerId,
}),

```

### Claiming LBTC

This operation mints the deposited amount of BTC into LBTC and transfers that
to the provided recipient address.

```javascript
const { digest } = await  claimLBTC({
    // The Sui chain id
    chainId: SUI_MAINNET_CHAIN,
    // The Sui wallet provider, see `@wallet-standard/base`
    wallet,
    // The raw paylod from a deposit, obtained from `getDepositsByAddress`
    payload,
    // The proof of a deposit, obtained from `getDepositsByAddress
    proof,
    // The wallet account, see `@wallet-standard/core`
    walletAccount,
    // The Sui client, see @mysten/sui/client
    client,
    // Optional env
    env = Env.prod,
});
```

### Unstaking LBTC

This operation burns given amount of LBTC and initiates transfer of BTC to the
given BTC address.

```javascript
const { digest } = await unstakeLBTC({
    // The Sui chain id
    chainId,
    // The Sui wallet provider, see `@wallet-standard/base`
    wallet,
    // The wallet account, see `@wallet-standard/core`
    walletAccount,
    // The Sui client, see @mysten/sui/client
    client,
    // The BTC destination address
    btcAddress,
    // The amount of LBTC to unstake, e.g. BigNumber(1.2)
    amount,
    // Optional env
    env = Env.prod,
});
```
