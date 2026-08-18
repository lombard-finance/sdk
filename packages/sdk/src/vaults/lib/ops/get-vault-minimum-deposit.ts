import { Env, TRpcUrlConfig } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { Abi, Address } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { ChainId } from '../../../common/chains';
import { Token } from '../../../tokens/token-addresses';
import { getTokenInfo } from '../../../tokens/tokens';
import { fromBaseDenomination } from '../../../tokens/tokens';
import { EARN_VAULT, isEarnChain } from '../config';

export type GetEarnMinimumDepositParameters = {
  /** The deposit token. Defaults to LBTC. */
  token?: Token;
  /** The chain where the deposit will be made. Defaults to Ethereum. */
  chainId?: ChainId;
  /**
   * Optional RPC URL for the active `chainId`. The Lens/Accountant reads are
   * Ethereum-only, so this is used for them only when `chainId` is Ethereum.
   * To supply an Ethereum endpoint while depositing from another chain, use
   * `rpcUrls`.
   */
  rpcUrl?: string;
  /**
   * Optional per-chain RPC URL map, keyed by chain ID. The Ethereum entry is
   * used for the Lens/Accountant reads regardless of which chain the deposit
   * comes from, and takes precedence over `rpcUrl`.
   */
  rpcUrls?: Partial<TRpcUrlConfig>;
  /** Optional environment. */
  env?: Env;
};

/**
 * Returns the minimum deposit amount (in human-readable format) for a given
 * token that will produce at least 1 vault share.
 *
 * The minimum is derived from the on-chain exchange rate. It is not a fixed
 * constant and changes as the vault accrues yield.
 *
 * @example
 * ```ts
 * const min = await getEarnMinimumDeposit();
 * // BigNumber(0.00000002), 2 satoshis at current rates
 * ```
 */
export async function getEarnMinimumDeposit({
  token = Token.LBTC,
  chainId = ChainId.ethereum,
  rpcUrl,
  rpcUrls,
  env,
}: GetEarnMinimumDepositParameters = {}): Promise<BigNumber> {
  const vault = EARN_VAULT;
  if (!isEarnChain(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Supported chains: ${vault.chains.join(', ')}`,
    );
  }

  const supportedChains = vault.tokens[token as keyof typeof vault.tokens] as
    | readonly ChainId[]
    | undefined;
  if (!supportedChains || !supportedChains.includes(chainId)) {
    throw new Error(
      `Token ${token} is not supported on chain ${chainId} for the Bitcoin Earn vault`,
    );
  }

  // Lens and Accountant are Ethereum-only contracts, so every read below goes
  // to Ethereum no matter which chain the deposit comes from. The single
  // `rpcUrl` belongs to the active chain and would be the wrong endpoint unless
  // that chain is Ethereum; the `rpcUrls` map is keyed per chain, so its
  // Ethereum entry always applies.
  const ethRpcUrl =
    rpcUrls?.[ChainId.ethereum] ??
    (chainId === ChainId.ethereum ? rpcUrl : undefined);

  // Resolve the token's Ethereum address for the query.
  let ethTokenAddress: Address;
  let tokenDecimals: number;

  if (chainId === ChainId.ethereum) {
    const tokenInfo = await getTokenInfo(
      token,
      ChainId.ethereum,
      env,
      ethRpcUrl,
    );
    if (!tokenInfo) {
      throw new Error(`Could not resolve token info for ${token} on Ethereum`);
    }
    ethTokenAddress = tokenInfo.address;
    tokenDecimals = tokenInfo.decimals;
  } else {
    // For cross-chain deposits, we still need the Ethereum token address
    // because the Lens/Accountant are on Ethereum.
    const ethTokenInfo = await getTokenInfo(
      token,
      ChainId.ethereum,
      env,
      ethRpcUrl,
    );
    if (!ethTokenInfo) {
      throw new Error(
        `Cannot determine minimum deposit for ${token}: token not available on Ethereum. ` +
          `The Lens and Accountant contracts are Ethereum-only.`,
      );
    }
    ethTokenAddress = ethTokenInfo.address;
    tokenDecimals = ethTokenInfo.decimals;
  }

  const ethPublicClient = makePublicClient({
    chainId: ChainId.ethereum,
    rpcUrl: ethRpcUrl,
    env,
  });

  const vaultAddress = vault.vaultContract.address as Address;
  const accountantAddress = vault.accountantContract.address as Address;
  const lensAddress = vault.lensContract.address as Address;
  const lensAbi = vault.lensContract.abi as Abi;
  const accountantAbi = vault.accountantContract.abi as Abi;

  // Batch: get the exchange rate and check if 1 base unit yields any shares.
  const [rateResult, previewOneResult] = await ethPublicClient.multicall({
    contracts: [
      {
        address: accountantAddress,
        abi: accountantAbi,
        functionName: 'getRateInQuote',
        args: [ethTokenAddress],
      },
      {
        address: lensAddress,
        abi: lensAbi,
        functionName: 'previewDeposit',
        args: [ethTokenAddress, 1n, vaultAddress, accountantAddress],
      },
    ],
  });

  if (rateResult.status !== 'success') {
    throw new Error(
      `Failed to get exchange rate for ${token}: ${rateResult.error}`,
    );
  }

  if (previewOneResult.status !== 'success') {
    throw new Error(
      `Failed to preview deposit for ${token}: ${previewOneResult.error}`,
    );
  }

  // If 1 base unit already yields shares, that's the minimum.
  if ((previewOneResult.result as bigint) > 0n) {
    return fromBaseDenomination('1', tokenDecimals);
  }

  // Calculate: minimum base units = ceil(rateInQuote / 10^vaultDecimals)
  const rateInQuote = rateResult.result as bigint;
  const oneShare = BigInt(10) ** BigInt(vault.decimals);
  const estimatedMin = (rateInQuote + oneShare - 1n) / oneShare;

  // Verify the estimate with previewDeposit.
  const verifyResult = await ethPublicClient.readContract({
    address: lensAddress,
    abi: lensAbi,
    functionName: 'previewDeposit',
    args: [ethTokenAddress, estimatedMin, vaultAddress, accountantAddress],
  });

  if ((verifyResult as bigint) > 0n) {
    return fromBaseDenomination(estimatedMin.toString(), tokenDecimals);
  }

  // Edge case: estimate was off (e.g., share premium). Batch all candidates
  // in a single multicall to avoid sequential RPC round trips.
  const maxAttempts = 10;
  const candidates = Array.from(
    { length: maxAttempts },
    (_, i) => estimatedMin + BigInt(i + 1),
  );

  const batchResults = await ethPublicClient.multicall({
    contracts: candidates.map((candidate) => ({
      address: lensAddress,
      abi: lensAbi,
      functionName: 'previewDeposit' as const,
      args: [ethTokenAddress, candidate, vaultAddress, accountantAddress],
    })),
  });

  for (let i = 0; i < batchResults.length; i++) {
    const result = batchResults[i];
    if (result.status === 'success' && (result.result as bigint) > 0n) {
      return fromBaseDenomination(candidates[i].toString(), tokenDecimals);
    }
  }

  throw new Error(
    `Could not determine minimum deposit amount for ${token} after ${maxAttempts} attempts`,
  );
}
