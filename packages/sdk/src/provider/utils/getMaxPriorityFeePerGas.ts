import BigNumber from 'bignumber.js';
import Web3 from 'web3';

export async function getMaxPriorityFeePerGas(
  rpcUrl: string,
): Promise<BigNumber> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_maxPriorityFeePerGas',
      params: [],
    }),
  });

  const data = await response.json();

  const convertedHexValue = Web3.utils.hexToNumber(data?.result);

  return new BigNumber(Number(convertedHexValue));
}
