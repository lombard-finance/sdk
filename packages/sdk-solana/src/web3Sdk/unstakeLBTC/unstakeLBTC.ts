import { BN, Program } from '@coral-xyz/anchor';
import { getOutputScript } from '@lombard.finance/sdk-common';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { DEFAULT_ENV, getConfig, networkToEnv } from '../../const/getConfig';
import { getConnection } from '../../const/rpcUrls';
import { getLbtcIdl } from '../../idl/getLbtcIdl';
import { ISolanaWalletProvider, SolanaNetwork } from '../../types';
import {
  ErrorCode,
  sendAndConfirmTransaction,
  SolanaSdkError,
} from '../../utils';
import { createOrGetAssociatedTokenAccount } from '../../utils/tokenAccount';

export interface UnstakeLBTCParams {
  /**
   * Amount of LBTC to unstake in base units
   */
  amount: string;

  /**
   * Bitcoin address where BTC should be sent after unstaking
   */
  btcAddress: string;

  /**
   * Network to use
   */
  network: SolanaNetwork;

  /**
   * Optional RPC endpoint to use
   */
  rpcUrl?: string;
}

/**
 * Unstake LBTC to receive BTC at the specified Bitcoin address
 * @param provider - Solana wallet provider
 * @param params - Parameters for unstaking LBTC
 * @returns Transaction signature
 */
export async function unstakeLBTC(
  provider: ISolanaWalletProvider,
  params: UnstakeLBTCParams,
): Promise<string> {
  try {
    const { amount, btcAddress, network, rpcUrl } = params;
    const env = networkToEnv[network] || DEFAULT_ENV;
    const { treasuryAddress, lbtcTokenMint } = getConfig(env);
    const connection = getConnection(network, rpcUrl);

    // Validate provider has a connected wallet
    if (!provider.publicKey) {
      throw SolanaSdkError.wrap(
        new Error('Wallet not connected'),
        ErrorCode.UNSTAKE_REJECTED,
        'Please connect your Solana wallet and ensure it is on the correct network.',
      );
    }

    // Create a program instance
    const programIdl = getLbtcIdl(network);
    const program = new Program(programIdl, {
      connection,
    });

    const scriptPubKey = Buffer.from(
      (await getOutputScript(btcAddress, env)).replace(/^0x/, ''),
      'hex',
    );

    const mint = new PublicKey(lbtcTokenMint);

    const [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('lbtc_config')],
      new PublicKey(program.programId),
    );

    // Pre-flight check: verify config account exists
    const configAccount = await connection.getAccountInfo(configPDA);
    if (!configAccount) {
      throw SolanaSdkError.wrap(
        new Error(`LBTC program config not found on ${network}`),
        ErrorCode.UNSTAKE_REJECTED,
        `LBTC unstaking is not available on ${network}. The program may not be deployed or configured.`,
      );
    }

    const userTA = await createOrGetAssociatedTokenAccount({
      provider,
      connection,
      ownerAddress: provider.publicKey.toBase58(),
      mintAddress: mint.toBase58(),
    });

    // Pre-flight check: verify user has LBTC balance
    const tokenBalance = await connection.getTokenAccountBalance(
      new PublicKey(userTA),
    );
    const userBalance = BigInt(tokenBalance.value.amount);
    const requestedAmount = BigInt(amount);
    if (userBalance < requestedAmount) {
      throw SolanaSdkError.wrap(
        new Error('Insufficient LBTC balance'),
        ErrorCode.UNSTAKE_REJECTED,
        `Insufficient LBTC balance. You have ${tokenBalance.value.uiAmountString} LBTC but requested to unstake ${Number(amount) / 1e8} LBTC.`,
      );
    }

    const tx = await program.methods
      .redeem(scriptPubKey, new BN(amount))
      .accounts({
        payer: provider.publicKey,
        holder: userTA,
        config: configPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        mint,
        treasury: treasuryAddress,
      })
      .transaction();

    const { signature } = await sendAndConfirmTransaction({
      instruction: tx,
      connection,
      provider,
      debugLabel: 'Unstake LBTC',
    });

    return signature;
  } catch (error: unknown) {
    throw SolanaSdkError.wrap(
      error,
      ErrorCode.UNSTAKE_REJECTED,
      'LBTC unstake operation failed',
    );
  }
}
