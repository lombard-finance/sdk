import axios from 'axios';
import { getApiConfig } from '../common/api-config';
import { IEnvParam } from '../common/parameters';
import BigNumber from 'bignumber.js';

type LBTCStatsResponse = { price: number; supply: number; tvl: number }[];

type LBTCHoldersResponse = number;

type StakingStatsResponse = {
  apr: number;
};

type Stats = {
  /** The BTC price  */
  price: BigNumber;
  /** The LBTC supply */
  supply: BigNumber;
  /** The LBTC TVL (supply * price) */
  tvl: BigNumber;
  /** The number of LBTC holders */
  holders: BigNumber;
  /** The total (historical) number of LBTC holders */
  historicalHolders: BigNumber;
  /** The staking APR */
  apr: BigNumber | undefined;
};

/** Gets the Lombard's TVL. */
export async function getLBTCStats(
  parameters?: { partnerId?: string } & IEnvParam,
) {
  const env = parameters?.env;
  const partnerId = parameters?.partnerId;

  const { bffApiUrl } = getApiConfig(env);
  if (!bffApiUrl) {
    throw new Error(
      `Could not determine API endpoint for provided environment: ${env}`,
    );
  }

  const { data } = await axios.get<LBTCStatsResponse>(
    `${bffApiUrl}/dune-api/query/getLBTCStats?partnerId=${partnerId || ''}`,
  );

  const { data: holders } = await axios.get<LBTCHoldersResponse>(
    `${bffApiUrl}/dune-api/query/lbtc-holders?partnerId=${partnerId || ''}`,
  );

  const { data: historicalHolders } = await axios.get<LBTCHoldersResponse>(
    `${bffApiUrl}/dune-api/query/getTotalLBTCUsers?partnerId=${partnerId || ''}`,
  );

  let apr = undefined;
  try {
    const { data: stakingStats } = await axios.get<StakingStatsResponse>(
      `${bffApiUrl}/lombard-sdk/staking-stats?partnerId=${partnerId || ''}`,
    );
    apr = stakingStats.apr;
  } catch (_err) {
    // NOOP
  }

  const stats: Stats = {
    price: BigNumber(data[0].price),
    supply: BigNumber(data[0].supply),
    tvl: BigNumber(data[0].tvl),
    holders: BigNumber(holders),
    historicalHolders: BigNumber(historicalHolders),
    apr: apr ? BigNumber(apr) : undefined,
  };

  return stats;
}
