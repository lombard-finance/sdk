import axios from 'axios';
import BigNumber from 'bignumber.js';

import { getApiConfig } from '../../../common/api-config';
import { ChainId } from '../../../common/chains';
import { IEnvParam } from '../../../common/parameters';
import { orderBy } from '../../../utils/array';
import { EARN_VAULT, EarnChain, isEarnChain } from '../config';

type PerformanceEntry = {
  aggregation_period: string;
  apy: number;
  chain_allocation: { [network: string]: number };
  fees: number;
  real_apy_breakdown: {
    allocation: number;
    apy: number;
    /** network */
    chain: string;
    protocol: string;
  }[];
  timestamp: string;
};

type PerformancePayload =
  | PerformanceEntry
  | PerformanceEntry[]
  | { Response: PerformanceEntry }
  | { Response: PerformanceEntry[] };

const normalizeSevenSeasPerformance = (
  payload: PerformancePayload | undefined,
): PerformanceEntry[] => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if ('Response' in payload) {
    const response = payload.Response;
    if (Array.isArray(response)) {
      return response;
    }
    if (response) {
      return [response];
    }
    return [];
  }

  return [payload];
};

export type GetEarnApyParameters = IEnvParam & {
  aggregationPeriod?: 7 | 14 | 30;
  chainId?: ChainId;
};

/** Gets the trailing APY performance history. */
export async function getEarnApy({
  aggregationPeriod = 7,
  chainId = ChainId.ethereum,
  env,
}: GetEarnApyParameters) {
  const response = await getVaultPerformance({
    aggregationPeriod,
    chainId,
    env,
  });

  const apys = response.map((r) => {
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

    const breakdown = r.real_apy_breakdown.map((b) => ({
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

  return orderBy(apys, (a) => a.timestamp.getTime(), 'desc');
}

type GetVaultPerformanceParameters = {
  aggregationPeriod?: 7 | 14 | 30;
  chainId: ChainId;
} & IEnvParam;

const CHAIN_ID_TO_NETWORK_MAP: Record<EarnChain, string> = {
  // NOTE: For now only `ethereum` is supported by the API.
  [ChainId.ethereum]: 'ethereum',

  // NOTE: The following networks are not supported for now. The API is supposed
  // to return the aggregated data for all vault chains.
  [ChainId.base]: 'base',
  [ChainId.binanceSmartChain]: 'bnb',
};

const NETWORK_TO_CHAIN_ID_MAP: Record<string, EarnChain> = {
  ethereum: ChainId.ethereum,
  base: ChainId.base,
  bnb: ChainId.binanceSmartChain,
};

/**
 * Gets the raw response of the performance apy api for the provided vault.
 */
async function getVaultPerformance({
  aggregationPeriod = 7,
  chainId,
  env,
}: GetVaultPerformanceParameters) {
  const vault = EARN_VAULT;
  if (!isEarnChain(chainId)) {
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

  const { bffApiUrl } = getApiConfig(env);
  if (!bffApiUrl) {
    throw new Error(
      `Could not determine API endpoint for provided environment: ${env}`,
    );
  }

  const params = new URLSearchParams({
    aggregation_period: String(aggregationPeriod),
    historical: 'true',
  });
  const url = `${bffApiUrl}/sevenseas-api/performance/${network}/${vault.vaultContract.address}?${params.toString()}`;

  const { data } = await axios.get<PerformancePayload>(url);

  return normalizeSevenSeasPerformance(data);
}
