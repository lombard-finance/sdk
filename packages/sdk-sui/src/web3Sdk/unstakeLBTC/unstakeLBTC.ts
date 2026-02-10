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

const SIGN_TRANSACTION_V2_FEATURE = 'sui:signTransaction';
const SIGN_TRANSACTION_V1_FEATURE = 'sui:signTransactionBlock';

// Wallets known to have issues with V2 signTransaction despite advertising support
// OKX claims V2 support but fails with "Cannot read properties of undefined (reading 'parameters')"
const WALLETS_FORCE_V1 = ['OKX Wallet', 'OKX'];

/**
 * Check if we should force V1 for this wallet.
 * Some wallets advertise V2 support but don't properly handle the new Transaction class.
 */
function shouldForceV1(wallet: WalletWithFeatures<SuiSignTransactionFeature>): boolean {
  const walletName = wallet.name || '';
  return WALLETS_FORCE_V1.some(name => 
    walletName.toLowerCase().includes(name.toLowerCase())
  );
}

/**
 * Unstake LBTC.
 * 
 * Supports both new (sui:signTransaction) and old (sui:signTransactionBlock) wallet interfaces.
 * Some wallets (like OKX) advertise V2 support but fail with the new Transaction class,
 * so we force V1 for known problematic wallets.
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

  // Cast to any to access both V1 and V2 features
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walletFeatures = (wallet as any).features || {};
  
  const walletHasV2 = !!walletFeatures[SIGN_TRANSACTION_V2_FEATURE];
  const walletHasV1 = !!walletFeatures[SIGN_TRANSACTION_V1_FEATURE];
  const forceV1 = shouldForceV1(wallet);
  
  // Use V2 only if available AND wallet is not in the force-V1 list
  const useV2 = walletHasV2 && !forceV1;

  const { transaction, preparedCoins: unstakingCoins } =
    await prepareCoinsTransaction({
      walletAccount,
      client,
      amount,
      coinType: config.LBTC,
    });

  const scriptPubKey = Array.from(
    Buffer.from((await getOutputScript(btcAddress, env)).replace(/^0x/, ''), 'hex'),
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

  // Use V2 signTransaction for wallets that properly support it (Phantom, etc.)
  if (useV2) {
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

  // Check if V1 is available
  if (!walletHasV1) {
    throw new Error(
      'Wallet does not support transaction signing (sui:signTransactionBlock not available)',
    );
  }

  // Use V1 signTransactionBlock (OKX, and other wallets with V2 issues)
  transaction.setSender(walletAccount.address);

  const signedTransaction = await walletFeatures[SIGN_TRANSACTION_V1_FEATURE].signTransactionBlock({
    chain: chainId,
    transactionBlock: transaction,
    account: walletAccount,
  });

  return client.executeTransactionBlock({
    transactionBlock: signedTransaction.transactionBlockBytes,
    signature: signedTransaction.signature,
  });
}
