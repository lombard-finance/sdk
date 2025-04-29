import axios from 'axios';
import { getApiConfig } from '../common/api-config';
import { IEnvParam } from '../common/parameters';
import BigNumber from 'bignumber.js';

/** Gets the Lombard's TVL. */
export async function getLBTCStats(parameters?: IEnvParam) {
  const env = parameters?.env;

  const { bffApiUrl } = getApiConfig(env);
  if (!bffApiUrl) {
    throw new Error(
      `Could not determine API endpoint for provided environment: ${env}`,
    );
  }

  const { data } = await axios.get<
    { price: number; supply: number; tvl: number }[]
  >(`${bffApiUrl}/dune-api/query/getLBTCStats`);

  const { data: holders } = await axios.get<number>(
    `${bffApiUrl}/dune-api/query/lbtc-holders`,
  );

  const { data: historicalHolders } = await axios.get<number>(
    `${bffApiUrl}/dune-api/query/getTotalLBTCUsers`,
  );

  const stats = {
    price: BigNumber(data[0].price),
    supply: BigNumber(data[0].supply),
    tvl: BigNumber(data[0].tvl),
    holders: BigNumber(holders),
    historicalHolders: BigNumber(historicalHolders),
  };

  return stats;
}
