import { useCallback, useState } from 'react';

import {
  InjectedWallet,
  ISolanaWalletProvider,
} from '../../types/walletProviders';
import { ErrorCode, SolanaSdkError } from '../../utils';
import { getSolanaWalletProvider } from '../../web3Sdk/detectWallet/detectWallet';

interface ConnectRequest {
  walletName: InjectedWallet;
}

export interface ConnectionData {
  address: string;
  walletName: InjectedWallet;
  provider: ISolanaWalletProvider;
}

export const DEFAULT_WALLET = InjectedWallet.PHANTOM;

export interface UseConnectResponse {
  data: ConnectionData | null;
  isConnected: boolean;
  error?: SolanaSdkError;
  isLoading: boolean;
  connect: (request: ConnectRequest) => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useConnect(): UseConnectResponse {
  const [error, setError] = useState<SolanaSdkError | undefined>(undefined);
  const [connectionData, setConnectionData] = useState<ConnectionData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentWalletName, setCurrentWalletName] =
    useState<InjectedWallet | null>(null);

  const requestConnect = useCallback(async (request: ConnectRequest) => {
    const { walletName } = request;
    setCurrentWalletName(walletName);
    setIsLoading(true);
    setError(undefined);
    console.log(`Connecting to ${walletName}...`);

    const provider = getSolanaWalletProvider(walletName);

    if (!provider) {
      throw new Error(`Could not get provider for ${walletName}.`);
    }

    if (!provider.publicKey || !provider.isConnected) {
      try {
        await provider.connect();
      } catch (connectError: unknown) {
        console.error(`Error connecting to ${walletName}:`, connectError);
        if (
          connectError instanceof Error &&
          connectError.message.includes('User rejected the request')
        ) {
          throw new Error('Connection rejected by user.');
        }
        throw new Error(
          `Failed to connect to ${walletName}. Ensure it's available and unlocked.`,
        );
      }
    }

    if (!provider.publicKey) {
      throw new Error(
        `Failed to get public key from ${walletName} after connection attempt.`,
      );
    }

    const result: ConnectionData = {
      provider,
      address: provider.publicKey.toString(),
      walletName,
    };

    setConnectionData(result);
    console.log(`${walletName} connected:`, result.address);
    return result;
  }, []);

  const connect = useCallback(
    async (request: ConnectRequest = { walletName: DEFAULT_WALLET }) => {
      try {
        await requestConnect(request);
      } catch (err) {
        console.error('Connection Hook Error:', err);
        setConnectionData(null);
        setCurrentWalletName(null);
        setError(SolanaSdkError.wrap(err, ErrorCode.CONNECTION_ERROR));
      } finally {
        setIsLoading(false);
      }
    },
    [requestConnect],
  );

  const disconnect = useCallback(async () => {
    console.log(`Disconnecting ${currentWalletName}...`);
    setIsLoading(true);
    setError(undefined);
    if (connectionData?.provider?.disconnect) {
      try {
        await connectionData.provider.disconnect();
        console.log(`${currentWalletName} disconnected.`);
      } catch (err) {
        console.error('Error during provider disconnect:', err);
      }
    }
    setConnectionData(null);
    setCurrentWalletName(null);
    setIsLoading(false);
  }, [connectionData, currentWalletName]);

  return {
    data: connectionData,
    isConnected: !!connectionData,
    error: error,
    isLoading,
    connect,
    disconnect,
  };
}
