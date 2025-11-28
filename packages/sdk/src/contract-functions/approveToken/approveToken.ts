import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { Address, Hash } from 'viem';

import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP, ChainId } from '../../common/chains';
import { CommonWriteParameters, IEnvParam } from '../../common/parameters';
import { Token } from '../../tokens/token-addresses';
import {
  fromBaseDenomination,
  getTokenInfo,
  toBaseDenomination,
} from '../../tokens/tokens';
import toBigInt from '../../utils/numbers';

export interface IApproveTokenParams extends CommonWriteParameters, IEnvParam {
  /**
   * The token to approve.
   */
  token: Token;
  /**
   * The spender account address.
   */
  spender: Address;
  /**
   * The approved amount of the token.
   */
  amount: BigNumber.Value;
}

/**
 * Approves the provided spender to withdraw a specified amount of a token from
 * your account.
 *
 * @param {IApproveTokenParams} parameters - The parameters.
 * @param {Token} parameters.token - The token to approve.
 * @param {Address} parameters.spender - The spender account address.
 * @param {BigNumber.Value} parameters.amount - The amount of the token.
 * @param {Address} parameters.account - The EVM account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {EIP1193Provider} parameters.provider - The EIP1193 provider.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<Hash>}
 */
export async function approveToken({
  account,
  token,
  spender,
  amount,
  chainId,
  provider,
  rpcUrl,
  env,
}: IApproveTokenParams): Promise<Hash> {
  const publicClient = makePublicClient({ chainId, rpcUrl, env });
  const walletClient = makeWalletClient({ chainId, provider });

  const tokenInfo = await getTokenInfo(token, chainId, env, rpcUrl);
  if (!tokenInfo) {
    throw new Error(`Token info not found for ${token} on chain ${chainId}`);
  }

  const amountBase = toBigInt(
    toBaseDenomination(BigNumber(amount), tokenInfo.decimals),
  );

  const { request } = await publicClient.simulateContract({
    address: tokenInfo.address,
    account,
    chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
    abi: tokenInfo.abi,
    functionName: 'approve',
    args: [spender, amountBase],
  });

  const txHash = await walletClient.writeContract(request);

  return txHash;
}

/**
 * Gets the allowance of a token for a spender.
 *
 * @param {Object} parameters - The parameters.
 * @param {Token} parameters.token - The token.
 * @param {Address} parameters.owner - The owner account address.
 * @param {Address} parameters.spender - The spender account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<BigNumber>}
 */
export async function getTokenAllowance({
  token,
  owner,
  spender,
  chainId,
  rpcUrl,
  env,
}: {
  token: Token;
  owner: Address;
  spender: Address;
  chainId: ChainId;
  rpcUrl?: string;
  env?: Env;
}): Promise<BigNumber> {
  const publicClient = makePublicClient({ chainId, rpcUrl, env });
  const tokenInfo = await getTokenInfo(token, chainId, env, rpcUrl);
  if (!tokenInfo) {
    throw new Error(`Token info not found for ${token} on chain ${chainId}`);
  }

  const allowanceRaw = (await publicClient.readContract({
    address: tokenInfo.address,
    abi: tokenInfo.abi,
    functionName: 'allowance',
    args: [owner, spender],
  })) as bigint;

  return fromBaseDenomination(allowanceRaw.toString(), tokenInfo.decimals);
}
