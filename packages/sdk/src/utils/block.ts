import axios from "axios";

import { ChainId, getLlamaChainName } from "../common/chains";

type Response = {
  height: number;
  timestamp: number;
};

export async function getBlockHeight(
  chainId: ChainId,
  timestamp: number | bigint,
) {
  const chainName = getLlamaChainName(chainId);

  if (!chainName) return;

  const { data } = await axios.get<Response>(
    `https://coins.llama.fi/block/${chainName}/${String(timestamp)}`,
  );

  return data.height;
}
