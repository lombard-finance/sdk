import {
  connect as starknet_connect,
  disconnect as starknet_disconnect,
} from '@starknet-io/get-starknet';
import { createContext, useCallback, useContext } from 'react';
import { RpcProvider, WalletAccount, defaultProvider } from 'starknet';
import { ERR_NO_STARKNET_WINDOW_OBJECT } from '../../utils/err';
import { getRpcProvider } from '../../utils/rpc-providers';
import { StarknetChainId } from '../../utils/chains';

const connectStarknet = async (rpcProvider?: RpcProvider) => {
  const starknetWindowObject = await starknet_connect({
    modalMode: 'alwaysAsk',
    modalTheme: 'light',
  });
  if (!starknetWindowObject) {
    throw ERR_NO_STARKNET_WINDOW_OBJECT;
  }

  const walletAccount = await WalletAccount.connect(
    rpcProvider || defaultProvider,
    starknetWindowObject,
  );

  return walletAccount;
};

export function useConnection() {
  const { walletAccount, setWalletAccount } = useContext(StarknetContext);

  const connect = useCallback(
    async (chainId?: StarknetChainId) => {
      console.info('Connecting starknet to', chainId);
      try {
        const walletAccount = await connectStarknet(
          getRpcProvider(chainId || StarknetChainId.SN_SEPOLIA),
        );
        setWalletAccount(walletAccount);
      } catch (err) {
        console.info('Could not connect to Starknet.', err);
      }
    },
    [setWalletAccount],
  );

  const disconnect = useCallback(async () => {
    console.info('disconnecting starknet');
    setWalletAccount(undefined);
    await starknet_disconnect();
  }, [setWalletAccount]);

  return {
    account: walletAccount,
    connect,
    disconnect,
  };
}

export const StarknetContext = createContext<{
  walletAccount: WalletAccount | undefined;
  setWalletAccount: (walletAccount: WalletAccount | undefined) => void;
}>({
  walletAccount: undefined,
  setWalletAccount: () => {
    throw new Error(
      'Do not use directly, use with the `starknetContext` decorator',
    );
  },
});
