import { useCallback, useEffect, useState } from 'react';
import { EIP1193Provider } from 'viem';
import {
  Config,
  useAccount,
  UseAccountReturnType,
  useConnect as useWagmiConnect,
  useDisconnect as useWagmiDisconnect,
} from 'wagmi';
import { injected } from 'wagmi/connectors';
import { ChainId } from '../../common/chains';

type CanPerformAction = {
  account: Extract<UseAccountReturnType<Config>, { status: 'connected' }> & {
    chainId: ChainId;
  };
  provider: EIP1193Provider;
};

export const canPerformAction = (arg: {
  account: UseAccountReturnType<Config>;
  provider: EIP1193Provider | undefined;
}): arg is CanPerformAction =>
  Boolean(
    arg.account.status === 'connected' &&
      arg.account.connector &&
      arg.account.address &&
      arg.account.chainId &&
      arg.provider,
  );

export function useConnection() {
  const { connect } = useWagmiConnect();
  const account = useAccount();
  const { disconnect } = useWagmiDisconnect();
  const [provider, setProvider] = useState<EIP1193Provider | undefined>(
    undefined,
  );

  const connectWallet = useCallback(() => {
    connect({ connector: injected() });
  }, [connect]);

  useEffect(() => {
    if (!account.address && provider) {
      setProvider(undefined);
    }

    const getProvider = async () => {
      const p = (await account.connector?.getProvider()) as EIP1193Provider;
      if (p) setProvider(p);
    };
    getProvider();
  }, [account, provider]);

  return {
    account,
    provider,
    connect: connectWallet,
    disconnect,
  };
}
