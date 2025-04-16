import { useConnection } from '../../hooks/useConnection';
import { Spinner } from '../Spinner';

export type ConnectButtonProps = {
  label?: string;
};

export function ConnectButton({ label }: ConnectButtonProps) {
  const { account, connect, disconnect } = useConnection();

  if (account.status === 'connected') {
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
          {account.status}
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
            background: account.chain ? 'var(--bs-gray-200)' : 'var(--bs-red)',
            color: account.chain ? 'var(--bs-black)' : 'var(--bs-white)',
            borderRadius: '5px',
            padding: '2px',
            fontSize: '0.8em',
          }}
        >
          {account.chain?.name || account.chainId}
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

  if (account.status === 'disconnected') {
    return (
      <button
        className="btn"
        style={{
          border: '1px solid var(--bs-gray-900)',
        }}
        type="button"
        onClick={() => connect()}
      >
        {label || 'Connect wallet'}
      </button>
    );
  }

  return (
    <button type="button" disabled className="btn">
      Awaiting wallet interaction{' '}
      <Spinner color="text-primary" className="ms-2" />
    </button>
  );
}
