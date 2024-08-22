import axios from 'axios';
import { IEnvParam } from '../../common/types/internalTypes';
import { OChainId, TChainId, TEnv } from '../../common/types/types';
import { fromSatoshi } from '../../common/utils/convertSatoshi';
import { getApiConfig } from '../apiConfig';
import { getCainIdByName } from '../utils/getCainIdByName';

type Address = string;

interface IDepositResponse {
  txid: string;
  index?: number;
  block_height?: string;
  block_time?: string;
  value: number;
  address: Address;
  to_chain: string;
  claim_tx?: string;
  raw_payload: string;
  payload: string;
  signature: string;
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
 * @param {IGetDepositsByAddressParams} params - the parameters for getting deposits
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
  });
}

export const demoDepositsByAddress: IDeposit[] = [
  {
    txid: 'txid0',
    index: 0,
    blockHeight: 100,
    blockTime: 1715964690,
    value: 0.2,
    address: 'address0',
    chainId: OChainId.holesky,
    isClaimed: false,
    rawPayload: 'rawPayload0',
    signature: 'signature0',
  },
  {
    txid: 'dasjmnkosdfjnkdsgjnk',
    index: 0,
    blockHeight: 110,
    blockTime: 1715964690,
    value: 0.3,
    address: 'adslhjnkbsfdahbk',
    chainId: OChainId.holesky,
    isClaimed: false,
    rawPayload: 'rawPayload0',
    signature: 'signature0',
  },
  {
    txid: '0xfsmkfdskm',
    index: 0,
    blockHeight: 102,
    blockTime: 1715964690,
    value: 0.55,
    address: 'dgfgfasd',
    chainId: OChainId.holesky,
    isClaimed: false,
  },
  {
    txid: 'kmgnjkofejnadwnjdasljmnkjgsdklmn',
    index: 0,
    blockHeight: 102,
    blockTime: 1715964691,
    value: 0.77,
    address: 'hgjhyewadwss',
    chainId: OChainId.holesky,
    isClaimed: false,
    isRestricted: true,
  },
  {
    txid: 'f6b6d0e1e77df21e406bd730c32b05c3fae8296491a1d946925eff07d02d5825',
    index: 1,
    blockHeight: 100,
    blockTime: 1715789138,
    value: 0.2,
    address: 'address1',
    chainId: OChainId.holesky,
    isClaimed: true,
    rawPayload: 'rawPayload1',
    signature: 'signature1',
  },
];
