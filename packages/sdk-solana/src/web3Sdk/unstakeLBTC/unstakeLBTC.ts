import { BN, Program } from '@coral-xyz/anchor';
import { getOutputScript } from '@lombard.finance/sdk-common';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { DEFAULT_ENV, getConfig, networkToEnv } from '../../const/getConfig';
import { getLbtcIdl } from '../../idl/getLbtcIdl';
import { SolanaNetwork, SolanaProviderInterface } from '../../types';
import { ErrorCode } from '../../types/errors';
import { sendAndConfirmTransaction } from '../../utils';
import { wrapError } from '../../utils/errors';
import { createOrGetAssociatedTokenAccount } from '../../utils/tokenAccount';
import { getConnection } from '../../const/rpcUrls';

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
  provider: SolanaProviderInterface,
  params: UnstakeLBTCParams,
): Promise<string> {
  try {
    const { amount, btcAddress, network, rpcUrl } = params;
    const env = networkToEnv[network] || DEFAULT_ENV;
    const { treasuryAddress, lbtcTokenMint } = getConfig(env);
    const connection = getConnection(network, rpcUrl);

    // Create a program instance
    const programIdl = getLbtcIdl(network);
    const program = new Program(programIdl, {
      connection,
    });

    const scriptPubKey = Buffer.from(
      getOutputScript(btcAddress, env).replace(/^0x/, ''),
      'hex',
    );

    const mint = new PublicKey(lbtcTokenMint);

    const [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('lbtc_config')],
      new PublicKey(program.programId),
    );

    const userTA = await createOrGetAssociatedTokenAccount({
      provider,
      connection,
      ownerAddress: provider.publicKey.toBase58(),
      mintAddress: mint.toBase58(),
    });

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

    console.log(`Transaction sent with signature: ${signature}`);

    return signature;
  } catch (error: unknown) {
    throw wrapError(
      error,
      ErrorCode.UNSTAKE_REJECTED,
      'LBTC unstake operation failed',
    );
  }
}
