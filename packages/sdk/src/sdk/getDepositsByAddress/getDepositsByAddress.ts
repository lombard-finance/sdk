import axios from 'axios';
import { IEnvParam } from '../../common/types/internalTypes';
import { TChainId, TEnv } from '../../common/types/types';
import { fromSatoshi } from '../../common/utils/convertSatoshi';
import { getApiConfig } from '../apiConfig';
import { getCainIdByName } from '../utils/getCainIdByName';

type Address = string;
type Seconds = number;

interface IDepositResponse {
  txid: string;
  value: number;
  address: Address;
  to_chain: string;
  notarization_wait_dur?: string | number;
  index?: number;
  raw_payload?: string;
  payload?: string;
  signature?: string;
  claim_tx?: string;
  block_height?: string;
  block_time?: string;
  sanctioned?: boolean;
}

interface IDepositsByAddressResponse {
  outputs: IDepositResponse[];
}

export interface IDeposit {
  txid: string;
  index?: number;
  blockHeight?: number;
  blockTime?: number;
  value: number;
  address: Address;
  chainId: TChainId;
  isClaimed: boolean;
  rawPayload?: string;
  signature?: string;
  isRestricted?: boolean;
  notarizationWaitDur?: Seconds;
  // bascule hash id
  payload?: string;
}

export interface IGetDepositsByAddressParams extends IEnvParam {
  /**
   * The EVM address to get deposits for
   */
  address: Address;
}

/**
 * Returns all deposits for a given address
 *
 * @param {IGetDepositsByAddressParams} params
 *
 * @returns {Promise<IDeposit[]>} a list of deposits
 */
export async function getDepositsByAddress({
  address,
  env,
}: IGetDepositsByAddressParams): Promise<IDeposit[]> {
  const { baseApiUrl } = getApiConfig(env);

  const { data } = await axios.get<IDepositsByAddressResponse | undefined>(
    `api/v1/address/outputs/${address}`,
    { baseURL: baseApiUrl },
  );

  const outputs = data?.outputs ?? [];

  return outputs.map(mapResponse(env));
}

function mapResponse(env?: TEnv) {
  return (data: IDepositResponse): IDeposit => ({
    txid: data.txid,
    index: data.index ?? 0,
    blockHeight: data.block_height ? Number(data.block_height) : undefined,
    blockTime: data.block_time ? Number(data.block_time) : undefined,
    value: fromSatoshi(data.value),
    address: data.address,
    chainId: getCainIdByName(data.to_chain, env),
    // todo: return claiming tx from the API when it's available
    isClaimed: !!data.claim_tx,
    rawPayload: data.raw_payload,
    signature: data.signature,
    isRestricted: !!data.sanctioned,
    notarizationWaitDur: data.notarization_wait_dur
      ? Number(data.notarization_wait_dur)
      : undefined,
    payload: data.payload,
  });
}
