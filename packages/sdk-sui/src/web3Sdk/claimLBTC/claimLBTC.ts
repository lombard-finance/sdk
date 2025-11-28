import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import type { SuiTransactionBlockResponse } from '@mysten/sui/client';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { SuiChain, SuiSignTransactionFeature } from '@mysten/wallet-standard';
import { WalletWithFeatures } from '@wallet-standard/base';
import type { WalletAccount } from '@wallet-standard/core';

import { getConfig } from '../../const';

type Not0xPrefixedHex = string;

interface IClaimLBTCParams {
  chainId: SuiChain;
  wallet: WalletWithFeatures<SuiSignTransactionFeature>;
  payload: Not0xPrefixedHex;
  proof: Not0xPrefixedHex;
  walletAccount: WalletAccount;
  client: SuiClient;
  env?: Env;
}

const SIGN_TRANSACTION_V2_FEATURE = 'sui:signTransaction';

/**
 * Claims LBTC.
 */
export async function claimLBTC({
  chainId,
  wallet,
  payload,
  proof,
  walletAccount,
  client,
  env = DEFAULT_ENV,
}: IClaimLBTCParams): Promise<SuiTransactionBlockResponse> {
  const transaction = new Transaction();

  const {
    mint: { target, denyList },
    treasuryAddress,
    consortiumAddress,
    bascule,
    LBTC,
  } = getConfig(env);

  transaction.moveCall({
    target,
    arguments: [
      transaction.object(treasuryAddress),
      transaction.object(consortiumAddress),
      transaction.object(denyList),
      transaction.object(bascule),
      transaction.pure.vector('u8', Array.from(Buffer.from(payload, 'hex'))),
      transaction.pure.vector('u8', Array.from(Buffer.from(proof, 'hex'))),
    ],
    typeArguments: [LBTC],
  });

  if (wallet.features[SIGN_TRANSACTION_V2_FEATURE]) {
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

  transaction.setSender(walletAccount.address);

  const signedTransaction = await wallet.features[
    // @ts-ignore The current wallet standard interface version doesn't support this type
    'sui:signTransactionBlock'
  ].signTransactionBlock({
    chain: chainId,
    transactionBlock: transaction,
    account: walletAccount,
  });

  return client.executeTransactionBlock({
    transactionBlock: signedTransaction.transactionBlockBytes,
    signature: signedTransaction.signature,
  });
}
