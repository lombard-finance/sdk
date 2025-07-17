import axios from 'axios';
import BigNumber from 'bignumber.js';
import { ChainId } from '../../../common/chains';
import { orderBy } from '../../../utils/array';
import { VAULTS, Vault, VedaVaultChain, isVedaVaultChain } from '../config';

export type GetVaultApyParameters = {
  aggregationPeriod?: 7 | 14 | 30;
  chainId?: ChainId;
  vaultKey?: Vault;
};

/** Gets the trailing APY performance history. */
export async function getVaultApy({
  aggregationPeriod = 7,
  chainId = ChainId.ethereum,
  vaultKey = Vault.Veda,
}: GetVaultApyParameters) {
  const response = await getVaultPerformance({
    aggregationPeriod,
    chainId,
    vaultKey,
  });

  const apys = response.Response.map(r => {
    const allocations = Object.entries(r.chain_allocation)
      .map(([network, value]) => [
        NETWORK_TO_CHAIN_ID_MAP[network],
        BigNumber(value),
      ])
      .reduce(
        (acc, cur) => {
          const [chainId, value] = cur as [ChainId, BigNumber];
          acc[chainId] = value;
          return acc;
        },
        {} as Partial<Record<ChainId, BigNumber>>,
      );

    const breakdown = r.real_apy_breakdown.map(b => ({
      allocations: BigNumber(b.allocation),
      apy: BigNumber(b.apy),
      chainId: NETWORK_TO_CHAIN_ID_MAP[b.chain],
      protocol: b.protocol,
    }));

    return {
      apy: BigNumber(r.apy),
      allocations,
      breakdown,
      timestamp: new Date(r.timestamp),
    };
  });

  return orderBy(apys, a => a.timestamp.getTime(), 'desc');
}

type GetVaultPerformanceParameters = {
  aggregationPeriod?: 7 | 14 | 30;
  chainId: ChainId;
  vaultKey?: Vault;
};

type Response = {
  Response: {
    aggregation_period: string;
    apy: number;
    chain_allocation: { [network: string]: number };
    fees: number;
    // omitted prop: global_apy_breakdown
    // omitted prop: maturity_apy_breakdown
    real_apy_breakdown: {
      allocation: number;
      apy: number;
      /** network */
      chain: string;
      protocol: string;
    }[];
    timestamp: string;
  }[];
};

const CHAIN_ID_TO_NETWORK_MAP: Record<VedaVaultChain, string> = {
  // NOTE: For now only `ethereum` is supported by the API.
  [ChainId.ethereum]: 'ethereum',

  // NOTE: The following networks are not supported for now. The API is supposed
  // to return the aggregated data for all vault chains.
  [ChainId.base]: 'base',
  [ChainId.binanceSmartChain]: 'bnb',
  [ChainId.corn]: 'corn',
};

const NETWORK_TO_CHAIN_ID_MAP: Record<string, VedaVaultChain> = {
  ethereum: ChainId.ethereum,
  base: ChainId.base,
  bnb: ChainId.binanceSmartChain,
  corn: ChainId.corn,
};

/**
 * Gets the raw response of the performance apy api for the provided vault.
 */
async function getVaultPerformance({
  aggregationPeriod = 7,
  chainId,
  vaultKey = Vault.Veda,
}: GetVaultPerformanceParameters) {
  const vault = VAULTS[vaultKey];
  if (!vault) {
    throw new Error(`Unknown vault key: ${vaultKey}`);
  }

  if (!isVedaVaultChain(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Please switch to one of the supported chains: ${vault.chains.join(', ')}`,
    );
  }

  const network = CHAIN_ID_TO_NETWORK_MAP[chainId];
  if (network !== 'ethereum') {
    throw new Error(
      `Unsupported network ${network}. Please switch to 'ethereum'.`,
    );
  }

  const url = `https://api.sevenseas.capital/performance/${network}/${vault.vaultContract.address}?historical=true&aggregation_period=${aggregationPeriod}`;

  const { data } = await axios.get<Response>(url);

  return data;
}
