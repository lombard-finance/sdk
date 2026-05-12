import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { Abi, Address } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { ChainId } from '../../../common/chains';
import { Token } from '../../../tokens/token-addresses';
import {
  fromBaseDenomination,
  getTokenInfo,
  toBaseDenomination,
} from '../../../tokens/tokens';
import toBigInt from '../../../utils/numbers';
import { EARN_VAULT, isEarnChain } from '../config';

export type PreviewEarnDepositParameters = {
  /** The deposit amount in human-readable format (e.g., "0.001"). */
  amount: BigNumber.Value;
  /** The deposit token. Defaults to LBTC. */
  token?: Token;
  /** The chain where the deposit will be made. Defaults to Ethereum. */
  chainId?: ChainId;
  /** Optional RPC URL for Ethereum (used for Lens queries). */
  rpcUrl?: string;
  /** Optional environment. */
  env?: Env;
};

/**
 * Returns the expected number of vault shares (in human-readable format)
 * for a given deposit amount.
 *
 * Uses the on-chain Lens contract to simulate the deposit, accounting for
 * the current exchange rate and any share premiums.
 *
 * @example
 * ```ts
 * const shares = await previewEarnDeposit({
 *   amount: '0.001',
 *   token: Token.LBTC,
 * });
 * // BigNumber(0.00098039), expected shares for 0.001 LBTC
 * ```
 */
export async function previewEarnDeposit({
  amount: amountRaw,
  token = Token.LBTC,
  chainId = ChainId.ethereum,
  rpcUrl,
  env,
}: PreviewEarnDepositParameters): Promise<BigNumber> {
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

  const amount = BigNumber(amountRaw);
  if (amount.isNegative() || amount.isZero()) {
    throw new Error('Deposit amount must be greater than zero');
  }

  // Lens is Ethereum-only. Resolve the token's Ethereum address.
  let ethTokenAddress: Address;
  let tokenDecimals: number;

  if (chainId === ChainId.ethereum) {
    const tokenInfo = await getTokenInfo(token, ChainId.ethereum, env, rpcUrl);
    if (!tokenInfo) {
      throw new Error(`Could not resolve token info for ${token} on Ethereum`);
    }
    ethTokenAddress = tokenInfo.address;
    tokenDecimals = tokenInfo.decimals;
  } else {
    const ethTokenInfo = await getTokenInfo(token, ChainId.ethereum, env);
    if (!ethTokenInfo) {
      throw new Error(
        `Cannot preview deposit for ${token}: token not available on Ethereum. ` +
          `The Lens contract is Ethereum-only.`,
      );
    }
    ethTokenAddress = ethTokenInfo.address;
    tokenDecimals = ethTokenInfo.decimals;
  }

  const amountBase = toBigInt(toBaseDenomination(amount, tokenDecimals));

  const ethPublicClient = makePublicClient({
    chainId: ChainId.ethereum,
    rpcUrl: chainId === ChainId.ethereum ? rpcUrl : undefined,
    env,
  });

  const vaultAddress = vault.vaultContract.address as Address;
  const accountantAddress = vault.accountantContract.address as Address;
  const lensAddress = vault.lensContract.address as Address;
  const lensAbi = vault.lensContract.abi as Abi;

  const shares = await ethPublicClient.readContract({
    address: lensAddress,
    abi: lensAbi,
    functionName: 'previewDeposit',
    args: [ethTokenAddress, amountBase, vaultAddress, accountantAddress],
  });

  return fromBaseDenomination((shares as bigint).toString(), vault.decimals);
}
