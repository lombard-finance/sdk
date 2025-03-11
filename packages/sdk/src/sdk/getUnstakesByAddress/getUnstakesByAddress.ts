import axios from 'axios';
import { address, networks } from 'bitcoinjs-lib';

import { IEnvParam } from '../../common/types/internalTypes';
import { SuiChain, TChainId } from '../../common/types/types';
import { fromSatoshi } from '../../common/utils/convertSatoshi';
import { getApiConfig } from '../../sdk/apiConfig';
import { TChainName } from '../../sdk/internalTypes';
import { getChainIdByName } from '../../sdk/utils/getChainIdByName';
import BigNumber from 'bignumber.js';

interface IUnstakeResponse {
  tx_hash: string;
  blockchain: TChainName;
  block_height: string;
  block_time: string;
  from_address: string;
  output_script: string;
  amount: string;
  payout_txid?: string;
  payout_index?: string;
  sanctioned?: boolean;
}

interface IGetUnstakesResponse {
  unstakes?: IUnstakeResponse[];
}

export interface IUnstake {
  /**
   * The unstake transaction hash.
   */
  txHash: string;
  /**
   * The chain id where unstake transaction happened.
   */
  chainId: TChainId | SuiChain;
  /**
   * The block height.
   */
  blockHeight: number;
  /**
   * The timestamp of the unstake transaction.
   */
  unstakeDate: Date;
  /**
   * The initiator of the unstake transaction.
   */
  fromAddress: string;
  /**
   * The destination address to which the funds (BTC) will be transferred.
   */
  toAddress: string;
  /**
   * The amount of BTC unstaked.
   */
  amount: BigNumber;
  /**
   * The BTC payout transaction hash.
   *
   * If empty then the unstake is still pending. The payout tx hash is only
   * present for the completed unstake transactions.
   *
   * A withdrawal period of 9 days is required by Lombard — daily rebalancing
   * cycle — and Babylon — 7 days unbonding period. After that the payout
   * should be completed.
   */
  payoutTxHash?: string;
  /**
   * The index of the payout transaction corresponding to the unstake.
   */
  payoutTxIndex?: number;
  /**
   * A flag indicating whether the unstake transaction has been sanctioned and
   * flagged as suspicious.
   * See: https://docs.lombard.finance/technical-documentation/sanctions-and-risk-monitoring
   */
  sanctioned?: boolean;
}

export interface IGetUnstakesByAddressParameters extends IEnvParam {
  /**
   * The address of an initiator of the unstake.
   */
  address: string;
}

/**
 * Gets all unstakes initiated by the specified address.
 *
 * @throws {Error} - Throws an error when there's no address specified.
 */
export async function getUnstakesByAddress({
  address,
  env = 'prod',
}: IGetUnstakesByAddressParameters): Promise<IUnstake[]> {
  const { baseApiUrl } = getApiConfig(env);

  if (!address) {
    throw new Error('No address specified.');
  }

  const {
    data: { unstakes = [] },
  } = await axios.get<IGetUnstakesResponse>(
    `/api/v1/address/unstakes/${address}`,
    {
      baseURL: baseApiUrl,
    },
  );

  return unstakes.map(unstakeData => mapResponse(unstakeData, env));
}

function mapResponse(data: IUnstakeResponse, env: IEnvParam['env']): IUnstake {
  const btcAddress = address.fromOutputScript(
    Buffer.from(data.output_script, 'hex'),
    env === 'prod' ? networks.bitcoin : networks.testnet,
  );

  return {
    txHash: data.tx_hash,
    chainId: getChainIdByName(data.blockchain, env),
    blockHeight: +data.block_height,
    unstakeDate: new Date(+data.block_time * 1000),
    fromAddress: data.from_address,
    toAddress: btcAddress,
    amount: fromSatoshi(data.amount),
    payoutTxHash: data.payout_txid,
    payoutTxIndex: data.payout_index ? +data.payout_index : undefined,
    sanctioned: data.sanctioned,
  };
}
