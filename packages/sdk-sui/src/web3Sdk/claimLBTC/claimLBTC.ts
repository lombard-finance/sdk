import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { SuiChain, SuiSignTransactionFeature } from '@mysten/wallet-standard';
import { WalletWithFeatures } from '@wallet-standard/base';
import type { WalletAccount } from '@wallet-standard/core';

import { getConfig } from '../../const';
import {
  executeSignedTransaction,
  type ISuiExecutedTransaction,
} from '../../utils/executeSignedTransaction';
import {
  deriveDepositId,
  getBasculeDepositStatus,
  type IGetSuiBasculeDepositStatusParameters,
  SuiBasculeDepositStatus,
} from '../getBasculeDepositStatus';

type Not0xPrefixedHex = string;

interface IClaimLBTCParams {
  chainId: SuiChain;
  wallet: WalletWithFeatures<SuiSignTransactionFeature>;
  payload: Not0xPrefixedHex;
  proof: Not0xPrefixedHex;
  walletAccount: WalletAccount;
  client: SuiGrpcClient;
  env?: Env;
}

const SIGN_TRANSACTION_V2_FEATURE = 'sui:signTransaction';

/**
 * The pre-flight reads the treasury and the Bascule over RPC, and either read can
 * fail outright: an unreachable node, or a treasury carrying no `bascule_check`
 * flag, whose mint aborts on chain for the same reason. Both used to reach the
 * caller as raw errors in the middle of a set of plain refusals, so they are
 * given that same shape, with the original kept as `cause`.
 */
async function readBasculeStatus(
  params: IGetSuiBasculeDepositStatusParameters,
): Promise<SuiBasculeDepositStatus> {
  try {
    return await getBasculeDepositStatus(params);
  } catch (error) {
    const refusal = new Error(
      'The deposit cannot be claimed because its bridge security status could not be read, please try again later.',
    );

    // Assigned rather than passed to the constructor, whose options argument
    // needs a lib the consuming apps do not all compile these sources with.
    (refusal as Error & { cause?: unknown }).cause = error;

    throw refusal;
  }
}

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
}: IClaimLBTCParams): Promise<ISuiExecutedTransaction> {
  // Checked here so a malformed payload is reported as itself rather than as the
  // "could not be read" refusal below, which covers the RPC reads.
  deriveDepositId(payload);

  // Pre-flight the Bascule status so we surface a clear error instead of an
  // opaque on-chain abort from bascule::validate_withdrawal (mirrors the EVM
  // SDK's claimLBTC). The mint targets the same Bascule object this checks.
  const basculeStatus = await readBasculeStatus({ client, payload, env });

  switch (basculeStatus) {
    // Either the deposit is reported, or the treasury does not consult the
    // Bascule for this mint at all.
    case SuiBasculeDepositStatus.REPORTED:
    case SuiBasculeDepositStatus.NOT_ENFORCED:
      break;
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

    return executeSignedTransaction(client, signedTransaction);
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

  return executeSignedTransaction(client, {
    bytes: signedTransaction.transactionBlockBytes,
    signature: signedTransaction.signature,
  });
}
