import axios from 'axios';
// packages/sdk-solana/src/stories/hooks/useFetchOutputs.ts
import { useCallback, useEffect, useState } from 'react';
import { SolanaNetwork } from '../../types'; // Adjust path as needed

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
}

interface IOutputsResponse {
  outputs: IOutput[];
}

interface UseFetchOutputsParams {
  address: string | null | undefined;
  environment: SolanaNetwork;
  isConnected: boolean;
}

interface UseFetchOutputsResult {
  outputs: IOutput[];
  isLoadingOutputs: boolean;
  outputsError: string | null;
  refetchOutputs: () => void;
}

export function useFetchOutputs({
  address,
  environment,
  isConnected,
}: UseFetchOutputsParams): UseFetchOutputsResult {
  const [outputs, setOutputs] = useState<IOutput[]>([]);
  const [isLoadingOutputs, setIsLoadingOutputs] = useState<boolean>(false);
  const [outputsError, setOutputsError] = useState<string | null>(null);

  const fetchOutputs = useCallback(async () => {
    if (!address || !isConnected) {
      setOutputs([]);
      setOutputsError(null);
      setIsLoadingOutputs(false);
      return;
    }

    setIsLoadingOutputs(true);
    setOutputsError(null);
    setOutputs([]);

    try {
      let baseApiUrl: string;
      switch (environment) {
        case SolanaNetwork.mainnet:
          baseApiUrl = 'https://mainnet.prod.lombard.finance';
          break;
        case SolanaNetwork.testnet:
          baseApiUrl = 'https://gastald-testnet.prod.lombard.finance';
          break;
        default: // Devnet/Staging
          baseApiUrl = 'https://staging.prod.lombard.finance';
          break;
      }

      const response = await axios.get<IOutputsResponse>(
        `${baseApiUrl}/api/v1/address/outputs-v2/${address}`,
      );

      const pendingOutputs =
        response.data.outputs?.filter(
          output =>
            output.to_chain === 'DESTINATION_BLOCKCHAIN_SOLANA' &&
            !output.claim_tx &&
            output.raw_payload &&
            output.proof &&
            output.notarization_status ===
              'NOTARIZATION_STATUS_SESSION_APPROVED',
        ) || [];

      setOutputs(pendingOutputs);

      if (pendingOutputs.length === 0) {
        setOutputsError('No pending outputs available for this address.');
      }
    } catch (error) {
      setOutputsError(
        `Failed to fetch outputs: ${
          error instanceof Error ? error.message : String(error)
        }`,
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
