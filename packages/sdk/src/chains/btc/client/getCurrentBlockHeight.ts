import axios from 'axios';

import { handleMempoolApiError } from './mempool/error';
import { getBtcApiConfig,TNetworkMode } from './mempool/mempool';

interface Response {
  height: number;
  hash: string;
  timestamp: string;
}

/**
 * Returns the current block height from the mempool.space API
 */
export async function getCurrentBlockHeight(
  mode: TNetworkMode,
): Promise<number> {
  const { mempoolApiUrl } = getBtcApiConfig(mode);
  const timestamp = Math.floor(Date.now() / 1000);
  const url = `${mempoolApiUrl}/api/v1/mining/blocks/timestamp/${timestamp}`;

  try {
    const { data } = await axios.get<Response>(url);
    return data.height;
  } catch (error) {
    handleMempoolApiError(error);
  }
}
