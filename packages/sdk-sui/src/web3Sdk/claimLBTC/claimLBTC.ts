import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import type { SuiTransactionBlockResponse } from '@mysten/sui/client';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { SuiChain, SuiSignTransactionFeature } from '@mysten/wallet-standard';
import { WalletWithFeatures } from '@wallet-standard/base';
import type { WalletAccount } from '@wallet-standard/core';

import { getConfig } from '../../const';
import {
  getBasculeDepositStatus,
  SuiBasculeDepositStatus,
} from '../getBasculeDepositStatus';

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
  // Pre-flight the Bascule status so we surface a clear error instead of an
  // opaque on-chain abort from bascule::validate_withdrawal (mirrors the EVM
  // SDK's claimLBTC). The mint targets the same Bascule object this checks.
  const basculeStatus = await getBasculeDepositStatus({ client, payload, env });
  if (basculeStatus !== SuiBasculeDepositStatus.REPORTED) {
    switch (basculeStatus) {
      case SuiBasculeDepositStatus.UNREPORTED:
        throw new Error(
          'The deposit cannot be claimed because it is unreported or potentially still pending, please try again later.',
        );
      case SuiBasculeDepositStatus.WITHDRAWN:
        throw new Error(
          'The deposit cannot be claimed because it is withdrawn already.',
        );
      case SuiBasculeDepositStatus.PAUSED:
        throw new Error(
          'The deposit cannot be claimed because the bridge is paused, please try again later.',
        );
      default:
        throw new Error(
          'The deposit cannot be claimed because it is blocked by bridge security.',
        );
    }
  }

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
