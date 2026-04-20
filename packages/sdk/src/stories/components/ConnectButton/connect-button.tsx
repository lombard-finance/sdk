import { avalanche, avalancheFuji } from '@wagmi/core/chains';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSwitchChain } from 'wagmi';
import { base, bsc, bscTestnet, holesky, mainnet, sepolia } from 'wagmi/chains';

import { useConnection } from '../../hooks/useConnection';
import { Spinner } from '../Spinner';

export type ConnectButtonProps = {
  label?: string;
};

// Available networks for switching
const AVAILABLE_NETWORKS = [
  { chain: mainnet, name: 'Ethereum' },
  { chain: base, name: 'Base' },
  { chain: bsc, name: 'BSC' },
  { chain: avalanche, name: 'Avalanche' },
  { chain: holesky, name: 'Holesky' },
  { chain: sepolia, name: 'Sepolia' },
  { chain: bscTestnet, name: 'BSC Testnet' },
  { chain: avalancheFuji, name: 'Avalanche Fuji' },
] as const;

export function ConnectButton({ label }: ConnectButtonProps) {
  const { account, connect, disconnect } = useConnection();
  const { switchChain, isPending: isSwitchingNetwork } = useSwitchChain();
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Update dropdown position when button position changes
  useEffect(() => {
    if (showNetworkDropdown && buttonRef.current) {
      const updatePosition = () => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) {
          setDropdownPosition({
            top: rect.bottom + 4,
            left: rect.right - 150, // Align to right (dropdown width = 150px)
          });
        }
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [showNetworkDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowNetworkDropdown(false);
      }
    }

    if (showNetworkDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showNetworkDropdown]);

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

        <button
          ref={buttonRef}
          type="button"
          style={{
            background: account.chain ? 'var(--bs-gray-200)' : 'var(--bs-red)',
            color: account.chain ? 'var(--bs-black)' : 'var(--bs-white)',
            borderRadius: '5px',
            padding: '2px 6px',
            fontSize: '0.8em',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          onClick={() => {
            setShowNetworkDropdown(!showNetworkDropdown);
          }}
          disabled={isSwitchingNetwork}
        >
          {account.chain?.name || account.chainId}
          <span style={{ fontSize: '0.7em' }}>▼</span>
        </button>

        {showNetworkDropdown &&
          createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                background: 'white',
                border: '1px solid var(--bs-gray-300)',
                borderRadius: '5px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 10000,
                minWidth: '150px',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {AVAILABLE_NETWORKS.map(network => {
                const isCurrentNetwork = account.chainId === network.chain.id;
                return (
                  <button
                    key={network.chain.id}
                    type="button"
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: isCurrentNetwork
                        ? 'var(--bs-gray-100)'
                        : 'transparent',
                      textAlign: 'left',
                      fontSize: '0.8em',
                      cursor: isCurrentNetwork ? 'default' : 'pointer',
                      fontWeight: isCurrentNetwork ? 'bold' : 'normal',
                    }}
                    onClick={() => {
                      if (!isCurrentNetwork) {
                        switchChain({ chainId: network.chain.id });
                        setShowNetworkDropdown(false);
                      }
                    }}
                    disabled={isCurrentNetwork || isSwitchingNetwork}
                    onMouseEnter={e => {
                      if (!isCurrentNetwork) {
                        e.currentTarget.style.background = 'var(--bs-gray-100)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isCurrentNetwork) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {isCurrentNetwork && '✓ '}
                    {network.name}
                  </button>
                );
              })}
            </div>,
            document.body,
          )}

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
          onClick={() => {
            disconnect();
          }}
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
        onClick={() => {
          connect();
        }}
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
