import { Env } from '@lombard.finance/sdk-common';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { getApiConfig } from '../../common/api-config';
import { getChainIdByName } from '../../common/blockchain-identifier';
import { ChainId, SolanaChain, SuiChain } from '../../common/chains';
import { IEnvParam } from '../../common/parameters';
import { fromSatoshi } from '../../utils/satoshi';

type Address = string;
type Seconds = number;

export enum ENotarizationStatus {
  NOTARIZATION_STATUS_UNSPECIFIED = 'NOTARIZATION_STATUS_UNSPECIFIED',
  // actually initial status for a deposit tx
  NOTARIZATION_STATUS_PENDING = 'NOTARIZATION_STATUS_PENDING',
  // the deposit was sent to the notarization
  NOTARIZATION_STATUS_SUBMITTED = 'NOTARIZATION_STATUS_SUBMITTED',
  // notarization was approved
  NOTARIZATION_STATUS_SESSION_APPROVED = 'NOTARIZATION_STATUS_SESSION_APPROVED',
  // notarization was failed
  NOTARIZATION_STATUS_FAILED = 'NOTARIZATION_STATUS_FAILED',
}

export enum ESessionState {
  SESSION_STATE_UNSPECIFIED = 'SESSION_STATE_UNSPECIFIED',
  SESSION_STATE_PENDING = 'SESSION_STATE_PENDING',
  SESSION_STATE_COMPLETED = 'SESSION_STATE_COMPLETED',
  SESSION_STATE_EXPIRED = 'SESSION_STATE_EXPIRED',
}

interface IDepositResponse {
  txid: string;
  value: number;
  address: Address;
  to_chain: string;
  notarization_wait_dur?: string | number;
  index?: number;
  raw_payload?: string;
  payload_hash?: string;
  proof?: string;
  claim_tx?: string; // tx on the destination chain
  block_height?: string;
  block_time?: string;
  sanctioned?: boolean;
  token_address?: string;
  aux_version?: number;
  session_id: number;
  notarization_status: ENotarizationStatus;
  session_state: ESessionState;
}

interface IDepositsByAddressResponse {
  outputs: IDepositResponse[];
}

export interface IDeposit {
  txid: string;
  index?: number;
  blockHeight?: number;
  blockTime?: number;
  value: BigNumber;
  address: Address;
  chainId: ChainId | SuiChain | SolanaChain;
  isClaimed?: boolean;
  claimedTxId?: string;
  rawPayload?: string;
  signature?: string;
  isRestricted?: boolean;
  notarizationWaitDur?: Seconds;
  // bascule hash id
  payload?: string;

  sessionId: number;
  notarizationStatus: ENotarizationStatus;
  sessionState: ESessionState;
  fromChainId?: ChainId | SuiChain | SolanaChain;
  toChainId?: ChainId | SuiChain | SolanaChain;
  status?: string;
  toAddress?: string;
  tokenAddress?: string;
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
    `api/v1/address/outputs-v2/${address}`,
    { baseURL: baseApiUrl },
  );

  const outputs = data?.outputs ?? [];

  return outputs.map(mapResponse(env));
}

function mapResponse(env?: Env) {
  return (data: IDepositResponse): IDeposit => ({
    txid: data.txid,
    index: data.index ?? 0,
    blockHeight: data.block_height ? Number(data.block_height) : undefined,
    blockTime: data.block_time ? Number(data.block_time) : undefined,
    value: fromSatoshi(data.value),
    address: data.address,
    chainId: getChainIdByName(data.to_chain, env),
    claimedTxId: data.claim_tx,
    isClaimed: !!data.claim_tx,
    rawPayload: data.raw_payload,
    signature: data.proof,
    isRestricted: !!data.sanctioned,
    notarizationWaitDur: data.notarization_wait_dur
      ? Number(data.notarization_wait_dur)
      : undefined,
    payload: data.payload_hash,
    sessionId: data.session_id,
    notarizationStatus: data.notarization_status,
    sessionState: data.session_state,
    tokenAddress: data.token_address,
  });
}
