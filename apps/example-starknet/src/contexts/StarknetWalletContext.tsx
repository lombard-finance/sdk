import { createContext, useCallback, useState, type ReactNode } from 'react';

import { normalizeStarknetAddress } from '../lib/normalizeStarknetAddress';

/**
 * Starknet wallet IDs
 */
export enum StarknetWalletId {
  Braavos = 'braavos',
  ArgentX = 'argentX',
}

/**
 * Window interface for Starknet wallets
 */
interface WindowWithStarknet extends Window {
  starknet_braavos?: {
    enable: () => Promise<string[]>;
    selectedAddress?: string;
    isConnected?: boolean;
    account?: unknown;
  };
  starknet_argentX?: {
    enable: () => Promise<string[]>;
    selectedAddress?: string;
    isConnected?: boolean;
    account?: unknown;
  };
}

/**
 * Starknet wallet configuration
 */
const STARKNET_WALLETS = {
  [StarknetWalletId.Braavos]: {
    name: 'Braavos',
    downloadUrl: 'https://braavos.app/download/',
    isInstalled: () => !!(window as WindowWithStarknet).starknet_braavos,
    getProvider: () => (window as WindowWithStarknet).starknet_braavos,
  },
  [StarknetWalletId.ArgentX]: {
    name: 'Ready Wallet',
    downloadUrl: 'https://www.ready.co/download-ready-wallet',
    isInstalled: () => !!(window as WindowWithStarknet).starknet_argentX,
    getProvider: () => (window as WindowWithStarknet).starknet_argentX,
  },
};

interface StarknetWalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  walletId: string | null;
  provider: unknown;
  connect: (walletId?: string) => Promise<void>;
  disconnect: () => void;
  installedWallets: { id: string; name: string }[];
}

export const StarknetWalletContext = createContext<StarknetWalletState>({
  address: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  walletId: null,
  provider: null,
  connect: async () => {},
  disconnect: () => {},
  installedWallets: [],
});

export function StarknetWalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [provider, setProvider] = useState<unknown>(null);

  const getInstalledWallets = useCallback(() => {
    return Object.entries(STARKNET_WALLETS)
      .filter(([_, config]) => config.isInstalled())
      .map(([id, config]) => ({ id, name: config.name }));
  }, []);

  const connect = useCallback(
    async (walletIdToConnect?: string) => {
      try {
        setIsConnecting(true);
        setError(null);

        const installed = getInstalledWallets();

        if (installed.length === 0) {
          throw new Error(
            'No Starknet wallet detected. Please install Braavos or Ready Wallet.',
          );
        }

        const targetWalletId = (walletIdToConnect ||
          installed[0].id) as StarknetWalletId;
        const config = STARKNET_WALLETS[targetWalletId];

        if (!config) {
          throw new Error(`Wallet ${targetWalletId} not found`);
        }

        const walletProvider = config.getProvider();

        if (!walletProvider) {
          throw new Error(`Could not get ${config.name} provider`);
        }

        const accounts = await walletProvider.enable();
        const addr = accounts?.[0] || walletProvider.selectedAddress;

        if (!addr) {
          throw new Error('No account returned from wallet');
        }

        setProvider(walletProvider);
        setWalletId(targetWalletId);
        setAddress(normalizeStarknetAddress(addr));
      } catch (err) {
        console.error('Failed to connect Starknet wallet:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to connect Starknet wallet',
        );
      } finally {
        setIsConnecting(false);
      }
    },
    [getInstalledWallets],
  );

  const disconnect = useCallback(() => {
    setProvider(null);
    setWalletId(null);
    setAddress(null);
  }, []);

  return (
    <StarknetWalletContext.Provider
      value={{
        address,
        isConnected: Boolean(address),
        isConnecting,
        error,
        walletId,
        provider,
        connect,
        disconnect,
        installedWallets: getInstalledWallets(),
      }}
    >
      {children}
    </StarknetWalletContext.Provider>
  );
}
