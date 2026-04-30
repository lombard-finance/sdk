import axios from 'axios';
import BigNumber from 'bignumber.js';
import { extractChain, PublicClient } from 'viem';
import * as chains from 'viem/chains';

import { makePublicClient } from '../../../clients/public-client';
import { getApiConfig } from '../../../common/api-config';
import { IEnvParam } from '../../../common/parameters';
import { Token } from '../../../tokens/token-addresses';
import {
  fromBaseDenomination,
  getTokenContractInfo,
  retrieveTokenProperties } from '../../../tokens/tokens';
import { EARN_VAULT, EarnChain } from '../config';

export type GetVaultBtcHolding = {
  rpcUrls?: Record<EarnChain, string>;
};
export async function getVaultBtcHolding({
  rpcUrls }: GetVaultBtcHolding) {
  const vault = EARN_VAULT;
  const clients: Partial<Record<EarnChain, PublicClient>> = {};
  for (const chainId of vault.chains) {
    const publicClient = makePublicClient({
      chainId: chainId,
      rpcUrl: rpcUrls?.[chainId] });
    clients[chainId] = publicClient;
  }

  const balances = [];

  for (const [token, chainIds] of Object.entries(vault.tokens)) {
    for (const chainId of chainIds) {
      const tokenContract = await getTokenContractInfo(token as Token, chainId);

      const publicClient = clients[chainId];
      if (!publicClient) continue;

      const tokenInfo = await retrieveTokenProperties(
        publicClient,
        tokenContract,
      );

      if (!tokenInfo) continue;

      const balanceRaw = await publicClient.readContract({
        abi: tokenContract.abi,
        address: tokenContract.address,
        functionName: 'balanceOf',
        args: [vault.vaultContract.address] });

      const balance = fromBaseDenomination(
        balanceRaw ? String(balanceRaw) : 0,
        tokenInfo.decimals,
      );

      const ch = extractChain({ chains: Object.values(chains), id: chainId });
      console.info(`Balance of ${token} on ${ch.name}: ${balance}`);

      balances.push(balance);
    }
  }

  return BigNumber.sum.apply(null, balances);
}

export type GetEarnTVLParameters = {
} & IEnvParam;

type DuneQueryResult = {
  net_btc_balance: number;
  price: number;
  vault_tvl: number;
};

type Response = {
  /** The TVL represented in BTC locked in the vault */
  btcBalance: BigNumber;
  /** The BTC price in US dollars */
  btcPrice: BigNumber;
  /** The TVL represented us US dollars */
  tvl: BigNumber;
};
export async function getEarnTVL({
  env }: GetEarnTVLParameters) {
  const { bffApiUrl } = getApiConfig(env);
  if (!bffApiUrl) {
    throw new Error(
      `Could not determine API endpoint for provided environment: ${env}`,
    );
  }

  const url = `${bffApiUrl}/dune-api/query/vault-tvl`;
  const { data } = await axios.get<DuneQueryResult>(url);

  const response: Response = {
    btcBalance: BigNumber(data.net_btc_balance),
    btcPrice: BigNumber(data.price),
    tvl: BigNumber(data.vault_tvl) };

  return response;
}
