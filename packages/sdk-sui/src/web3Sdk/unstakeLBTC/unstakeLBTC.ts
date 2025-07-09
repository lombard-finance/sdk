import { DEFAULT_ENV, Env, getOutputScript } from '@lombard.finance/sdk-common';
import type { SuiTransactionBlockResponse } from '@mysten/sui/client';
import { SuiClient } from '@mysten/sui/client';
import { SuiChain, SuiSignTransactionFeature } from '@mysten/wallet-standard';
import { WalletWithFeatures } from '@wallet-standard/base';
import type { WalletAccount } from '@wallet-standard/core';
import BigNumber from 'bignumber.js';
import { getConfig } from '../../const';
import { prepareCoinsTransaction } from '../prepareAmount';

interface IUnstakeLBTCParams {
  chainId: SuiChain;
  wallet: WalletWithFeatures<SuiSignTransactionFeature>;
  walletAccount: WalletAccount;
  client: SuiClient;
  btcAddress: string;
  amount: BigNumber;
  env?: Env;
}

/**
 * Unstake LBTC.
 */
export async function unstakeLBTC({
  chainId,
  wallet,
  walletAccount,
  client,
  btcAddress,
  amount,
  env = DEFAULT_ENV,
}: IUnstakeLBTCParams): Promise<SuiTransactionBlockResponse> {
  const config = getConfig(env);

  const { transaction, preparedCoins: unstakingCoins } =
    await prepareCoinsTransaction({
      walletAccount,
      client,
      amount,
      coinType: config.LBTC,
    });

  const scriptPubKey = Array.from(
    Buffer.from(getOutputScript(btcAddress, env).replace(/^0x/, ''), 'hex'),
  );

  transaction.moveCall({
    target: config.redeem.target,
    arguments: [
      transaction.object(config.treasuryAddress),
      unstakingCoins,
      transaction.pure.vector('u8', scriptPubKey),
    ],
    typeArguments: [config.LBTC],
  });

  const signedTransaction = await wallet.features[
    'sui:signTransaction'
  ].signTransaction({
    chain: chainId,
    transaction,
    account: walletAccount,
  });

  return client.executeTransactionBlock({
    transactionBlock: signedTransaction.bytes,
    signature: signedTransaction.signature,
  });
}
