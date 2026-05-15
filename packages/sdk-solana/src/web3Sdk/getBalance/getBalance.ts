import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  AccountInfo,
  Connection,
  ParsedAccountData,
  PublicKey,
  RpcResponseAndContext,
} from '@solana/web3.js';
import BigNumber from 'bignumber.js';

import { INVALID_ADDRESS_ERROR } from '../../const/known-errors';
import { DEFAULT_NETWORK, getConnection } from '../../const/rpcUrls';
import { SOL_DECIMALS, SOL_SCALE } from '../../const/token';
import { GetBalanceParams, GetBalanceResult } from '../../types/sdkTypes';
import { ErrorCode, SolanaSdkError } from '../../utils/errors';

const isParsedAccountData = (
  accountInfo: RpcResponseAndContext<AccountInfo<
    Buffer | ParsedAccountData
  > | null>,
): accountInfo is RpcResponseAndContext<AccountInfo<ParsedAccountData> | null> => {
  if (!accountInfo.value?.data) return false;
  return (
    typeof (accountInfo.value.data as ParsedAccountData).parsed !== 'undefined'
  );
};

/**
 * Extract token amount from parsed account info
 * @param accountInfo The parsed account info from the RPC
 * @returns The token amount and decimals or null if not found
 */
function extractTokenData(
  accountInfo: RpcResponseAndContext<AccountInfo<
    Buffer | ParsedAccountData
  > | null>,
): { amount: string; decimals: number } | null {
  if (!isParsedAccountData(accountInfo)) {
    return null;
  }

  try {
    const data = accountInfo.value?.data;
    if (!data?.parsed?.info?.tokenAmount) {
      return null;
    }

    return {
      amount: data.parsed.info.tokenAmount.amount,
      decimals: data.parsed.info.tokenAmount.decimals,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches balance from Solana
 * @param connection The Solana connection to use
 * @param pubKey The public key to get the balance for
 * @param tokenAddress Optional token address for SPL tokens
 * @returns The balance result
 */
async function fetchBalance(
  connection: Connection,
  pubKey: PublicKey,
  tokenAddress?: string,
): Promise<GetBalanceResult> {
  // If no token address is provided, get SOL balance
  if (!tokenAddress) {
    const balance = await connection.getBalance(pubKey);
    return {
      total: new BigNumber(balance).dividedBy(SOL_SCALE),
      decimals: SOL_DECIMALS,
    };
  }

  // Otherwise, get SPL token balance
  const tokenPubKey = new PublicKey(tokenAddress);
  const tokenAccounts = await connection.getTokenAccountsByOwner(pubKey, {
    programId: TOKEN_PROGRAM_ID,
    mint: tokenPubKey,
  });

  if (tokenAccounts.value.length === 0) {
    return {
      total: new BigNumber(0),
      decimals: 0,
    };
  }

  // Process token accounts
  let totalBalance = new BigNumber(0);
  let decimals = 0;

  for (const account of tokenAccounts.value) {
    try {
      const accountInfo = await connection.getParsedAccountInfo(account.pubkey);
      if (!accountInfo.value) continue;

      const tokenData = extractTokenData(accountInfo);
      if (!tokenData) continue;

      totalBalance = totalBalance.plus(tokenData.amount);
      decimals = tokenData.decimals;
    } catch {
      return {
        total: new BigNumber(0),
        decimals: 0,
      };
    }
  }

  return {
    total: totalBalance.dividedBy(10 ** decimals),
    decimals,
  };
}

/**
 * Get the balance of SOL or an SPL token for a Solana address
 * @param params Parameters for getting a balance
 * @returns The balance result with total and decimals
 */
export async function getBalance({
  publicKey,
  tokenAddress,
  network = DEFAULT_NETWORK,
  rpcUrl,
  env,
}: GetBalanceParams): Promise<GetBalanceResult> {
  try {
    // Validate the public key
    let pubKey: PublicKey;
    try {
      pubKey = new PublicKey(publicKey);
    } catch {
      throw INVALID_ADDRESS_ERROR;
    }

    // Validate token address if provided
    if (tokenAddress) {
      try {
        new PublicKey(tokenAddress);
      } catch (error) {
        throw SolanaSdkError.wrap(
          error,
          ErrorCode.INVALID_ADDRESS,
          `Invalid token address: ${tokenAddress}`,
        );
      }
    }

    // Setup connection with appropriate RPC URL
    const connection = getConnection(network, rpcUrl, env);

    try {
      return await fetchBalance(connection, pubKey, tokenAddress);
    } catch (error) {
      // Check if it's a 403 or access denied error (common with public RPC endpoints)
      if (
        error instanceof Error &&
        (error.message.includes('403') ||
          error.message.includes('forbidden') ||
          error.message.includes('access denied'))
      ) {
        const errorMessage =
          'RPC access forbidden (HTTP 403). The public Solana RPC endpoints have strict rate limits ' +
          'and may block requests. For production use, please use a dedicated RPC provider.';

        throw SolanaSdkError.wrap(error, ErrorCode.NETWORK_ERROR, errorMessage);
      }

      throw SolanaSdkError.wrap(
        error,
        ErrorCode.RPC_ERROR,
        `Failed to get balance for ${publicKey}`,
      );
    }
  } catch (error) {
    throw SolanaSdkError.wrap(error);
  }
}
