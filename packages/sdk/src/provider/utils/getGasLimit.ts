import Web3, { Bytes, Transaction, utils } from 'web3';
import { OChainId } from '../../common/types/types';

interface IParams {
  from?: string | null;
  to?: string | null;
  data?: Bytes | null;
  value?: string | null;
}

export async function getGasLimit(
  web3Read: Web3,
  tx: Transaction,
  chainId: number,
) {
  if (
    chainId === OChainId.binanceSmartChain ||
    chainId === OChainId.binanceSmartChainTestnet
  ) {
    const params: IParams = {
      from: tx.from,
      to: tx.to,
      data: tx.data,
    };

    if (tx.value) {
      params['value'] = utils.numberToHex(Number(tx.value));
    }

    const estimatedGas = await web3Read?.currentProvider?.request({
      method: 'eth_estimateGas',
      params: [params],
      jsonrpc: '2.0',
      id: Date.now(),
    });

    return Number(utils.numberToHex(Math.round(Number(estimatedGas?.result))));
  } else {
    const estimatedGas = await web3Read.eth.estimateGas(tx);

    return Number(estimatedGas);
  }
}
