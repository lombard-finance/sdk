import { useEffect, useState } from 'react';

import { StarknetChainId } from '../../../utils/chains';
import { useConnection } from '../../hooks/use-connection';

export type ConnectButtonProps = {
  desiredChainId?: StarknetChainId;
  label?: string;
};

export function ConnectButton({ desiredChainId, label }: ConnectButtonProps) {
  const [chainId, setChainId] = useState<StarknetChainId | undefined>(
    undefined,
  );
  const { account, connect, disconnect } = useConnection();

  useEffect(() => {
    if (!account) {
      if (!chainId) setChainId(undefined);
      return;
    }

    async () => {
      const connectedChainId = (await account.getChainId()) as StarknetChainId;

      if (chainId !== connectedChainId) {
        setChainId(connectedChainId);
      }
    };
  }, [account, chainId]);

  if (account) {
    return (
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '5px',
          border: '1px solid var(--bs-gray-900)',
          borderRadius: '5px',
          padding: '5px',
          height: '38px',
        }}
      >
        <span
          style={{
            background: 'var(--bs-green)',
            color: '#ffffff',
            borderRadius: '5px',
            padding: '2px',
            fontSize: '0.8em',
          }}
        >
          connected
        </span>

        <span
          style={{
            background: 'var(--bs-gray-100)',
            borderRadius: '5px',
            padding: '2px',
            fontSize: '0.8em',
          }}
        >
          {account.address}
        </span>

        <span
          style={{
            background: chainId ? 'var(--bs-gray-200)' : 'var(--bs-red)',
            color: chainId ? 'var(--bs-black)' : 'var(--bs-white)',
            borderRadius: '5px',
            padding: '2px',
            fontSize: '0.8em',
          }}
        >
          {chainId}
        </span>

        <button
          type="button"
          style={{
            background: 'var(--bs-danger)',
            color: 'var(--bs-white)',
            border: '0',
            borderRadius: '5px',
            padding: '2px',
            fontSize: '0.8em',
            cursor: 'pointer',
          }}
          onClick={() => disconnect()}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      className="btn"
      style={{
        border: '1px solid var(--bs-gray-900)',
      }}
      type="button"
      onClick={() => connect(desiredChainId)}
    >
      {label || 'Connect wallet'}
    </button>
  );
}
