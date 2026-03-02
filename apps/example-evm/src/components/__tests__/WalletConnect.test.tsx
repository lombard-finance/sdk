import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEvmWallet } from '../../hooks/useEvmWallet';
import { WalletConnect } from '../WalletConnect';

vi.mock('../../hooks/useEvmWallet', () => ({
  useEvmWallet: vi.fn(),
}));

describe('WalletConnect', () => {
  const connect = vi.fn();
  const disconnect = vi.fn();
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    Object.defineProperty(window, 'ethereum', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
  });

  const renderComponent = () => {
    act(() => {
      root.render(<WalletConnect />);
    });
  };

  it('renders connect state and triggers connect', () => {
    vi.mocked(useEvmWallet).mockReturnValue({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      connect,
      disconnect,
    });

    renderComponent();

    const connectButton = container.querySelector('button');
    expect(connectButton?.textContent).toContain('Connect Wallet');

    act(() => {
      connectButton?.click();
    });

    expect(connect).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('No wallet detected.');
  });

  it('renders connected state and triggers disconnect', () => {
    vi.mocked(useEvmWallet).mockReturnValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      isConnected: true,
      isConnecting: false,
      error: null,
      connect,
      disconnect,
    });

    renderComponent();

    expect(container.textContent).toContain('0x1234...5678');

    const disconnectButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'Disconnect',
    );

    act(() => {
      disconnectButton?.click();
    });

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('shows copy button when connected', () => {
    vi.mocked(useEvmWallet).mockReturnValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      isConnected: true,
      isConnecting: false,
      error: null,
      connect,
      disconnect,
    });

    renderComponent();

    const copyButton = Array.from(container.querySelectorAll('button')).find(
      button => button.getAttribute('title') === 'Copy address',
    );
    expect(copyButton).toBeTruthy();
  });

  it('copy button calls clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    vi.mocked(useEvmWallet).mockReturnValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      isConnected: true,
      isConnecting: false,
      error: null,
      connect,
      disconnect,
    });

    renderComponent();

    const copyButton = Array.from(container.querySelectorAll('button')).find(
      button => button.getAttribute('title') === 'Copy address',
    );

    await act(async () => {
      copyButton?.click();
    });

    expect(writeText).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
  });
});
