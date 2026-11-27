import { Env } from '@lombard.finance/sdk-common';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

import { ErrorCode, SolanaSdkError } from '../../utils';

// Interfaces (copied from story file)
export interface IOutput {
  txid: string;
  value: string;
  address: string;
  to_chain: string;
  index?: number;
  raw_payload?: string;
  payload_hash?: string;
  proof?: string;
  claim_tx?: string;
  block_height?: string;
  block_time?: string;
  sanctioned?: boolean;
  session_id: number;
  notarization_status: string;
  session_state: string;
  token_address?: string;
  aux_version?: number;
  notarization_wait_dur?: string;
}

interface IOutputsResponse {
  outputs: IOutput[];
}

interface UseFetchOutputsParams {
  address: string | null | undefined;
  environment: Env;
  isConnected: boolean;
}

interface UseFetchOutputsResult {
  outputs: IOutput[];
  isLoadingOutputs: boolean;
  outputsError: SolanaSdkError | undefined;
  refetchOutputs: () => void;
}

export function useFetchOutputs({
  address,
  environment,
  isConnected,
}: UseFetchOutputsParams): UseFetchOutputsResult {
  const [outputs, setOutputs] = useState<IOutput[]>([]);
  const [isLoadingOutputs, setIsLoadingOutputs] = useState<boolean>(false);
  const [outputsError, setOutputsError] = useState<SolanaSdkError | undefined>(
    undefined,
  );

  const fetchOutputs = useCallback(async () => {
    if (!address || !isConnected) {
      setOutputs([]);
      setOutputsError(undefined);
      setIsLoadingOutputs(false);
      return;
    }

    setIsLoadingOutputs(true);
    setOutputsError(undefined);
    setOutputs([]);

    try {
      const apiUrls: Record<Env, string> = {
        prod: 'https://mainnet.prod.lombard.finance',
        testnet: 'https://gastald-testnet.prod.lombard-fi.com',
        stage: 'https://staging.prod.lombard.finance',
        dev: 'https://bft-dev.stage.lombard-fi.com',
        ibc: 'https://ibc.stage.lombard-fi.com',
      };
      const baseApiUrl = apiUrls[environment];

      const response = await axios.get<IOutputsResponse>(
        `${baseApiUrl}/api/v1/address/outputs-v2/${address}`,
      );

      const solanaOutputs =
        response.data.outputs?.filter(
          (output) =>
            output.to_chain === 'DESTINATION_BLOCKCHAIN_SOLANA' &&
            !output.claim_tx,
        ) || [];

      setOutputs(solanaOutputs);

      if (solanaOutputs.length === 0) {
        setOutputsError(
          new SolanaSdkError(
            'No outputs found for this address.',
            ErrorCode.UNKNOWN_ERROR,
          ),
        );
      }
    } catch (error) {
      setOutputsError(
        SolanaSdkError.wrap(
          error,
          ErrorCode.RPC_ERROR,
          'Failed to fetch outputs',
        ),
      );
    } finally {
      setIsLoadingOutputs(false);
    }
  }, [address, environment, isConnected]);

  useEffect(() => {
    fetchOutputs();
  }, [fetchOutputs]); // Dependency is the memoized fetch function

  return {
    outputs,
    isLoadingOutputs,
    outputsError,
    refetchOutputs: fetchOutputs,
  };
}
