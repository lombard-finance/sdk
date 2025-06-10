import {
  Config,
  Connector,
  useAccount,
  UseAccountReturnType,
  useConnect as useWagmiConnect,
  useDisconnect as useWagmiDisconnect,
} from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useCallback, useEffect, useState } from 'react';
import { Address, Chain, EIP1193Provider } from 'viem';
import { ChainId } from '../../common/chains';

type CanPerformAction<
  config extends Config = Config,
  ///
  chain = Config extends config ? Chain : config['chains'][number],
> = {
  account: {
    address: Address;
    addresses: readonly [Address, ...Address[]];
    chain: chain | undefined;
    chainId: ChainId;
    connector: Connector;
    isConnected: true;
    isConnecting: false;
    isDisconnected: false;
    isReconnecting: false;
    status: 'connected';
  };
  provider: EIP1193Provider;
};

export const canPerformAction = <config extends Config = Config>(arg: {
  account: UseAccountReturnType<config>;
  provider: EIP1193Provider | undefined;
}): arg is CanPerformAction<config> =>
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
