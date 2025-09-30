import { BigNumber } from 'bignumber.js';
import { ChainParameters } from '../utils/chains';
import { Address } from '../utils/common';
import { getTokenContract, TokenParameters } from '../tokens/lib/tokens';
import { fromBaseDenomination } from '@lombard.finance/sdk-common/utils/numbers';
import { getRpcProvider } from '../utils/rpc-providers';
import { EnvParameters } from '../utils/env';

type BalanceOfParameters = {
  /** The account address */
  account: Address;
} & TokenParameters &
  ChainParameters &
  EnvParameters;

export async function balanceOf({
  account,
  token,
  chainId,
  env,
}: BalanceOfParameters) {
  const provider = getRpcProvider(chainId);

  const contract = getTokenContract({
    chainId,
    contractType: 'token',
    provider,
    token,
    env,
  });

  const balanceRaw = (await contract.balance_of(account)) as bigint;
  const balance = BigNumber(String(balanceRaw));

  const decimals = (await contract.decimals()) as number;

  const tokenBalance = fromBaseDenomination(balance, decimals);

  console.info(
    `${account} ${token} balance = ${tokenBalance} (decimals: ${decimals})`,
  );

  return tokenBalance;
}
