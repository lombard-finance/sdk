import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AssetId, Env } from '@lombard.finance/sdk';

import { useEvmWallet } from '../../hooks/useEvmWallet';
import { WithdrawForm } from '../WithdrawForm';

vi.mock('../../hooks/useEvmWallet', () => ({
  useEvmWallet: vi.fn(),
}));

function mockWallet(overrides = {}) {
  vi.mocked(useEvmWallet).mockReturnValue({
    address: '0xabc123',
    isConnected: true,
    isConnecting: false,
    error: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    switchNetwork: vi.fn(),
    ...overrides,
  });
}

describe('EVM WithdrawForm', () => {
  let root: Root;
  let container: HTMLDivElement;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
  });

  function renderForm(
    props: Partial<React.ComponentProps<typeof WithdrawForm>> = {},
  ) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const defaultProps = {
      env: Env.stage,
      onSubmit: vi.fn().mockResolvedValue(undefined),
      isLoading: false,
      ...props,
    };

    act(() => {
      root.render(<WithdrawForm {...defaultProps} />);
    });

    return defaultProps;
  }

  it('submits unstake payload with BTC output by default', async () => {
    mockWallet();
    const { onSubmit } = renderForm();

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(vi.mocked(onSubmit).mock.calls[0][0]).toMatchObject({
      assetOut: AssetId.BTC,
    });
  });

  it('has asset output selector with BTC and BTCb options', () => {
    mockWallet();
    renderForm();

    const assetSelect = container.querySelector(
      '#assetOut',
    ) as HTMLSelectElement;
    expect(assetSelect).toBeTruthy();

    const options = Array.from(assetSelect.options).map((o) => o.value);
    expect(options).toContain(AssetId.BTC);
    expect(options).toContain(AssetId.BTCb);
  });

  it('uses signet chain for testnet dest', () => {
    mockWallet();
    renderForm({ env: Env.testnet });

    // For BTC output, dest should be signet
    const destInfo = container.querySelector('.bg-blue-50');
    expect(destInfo?.textContent).toContain('Bitcoin Signet');
  });

  it('disables submit when disabled prop is true', () => {
    mockWallet();
    renderForm({ disabled: true });

    const button = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Connect Wallet');
  });

  it('shows loading state when isLoading is true', () => {
    mockWallet();
    renderForm({ isLoading: true });

    const button = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Processing');
  });

  it('has source chain selector', () => {
    mockWallet();
    renderForm();

    const sourceChainSelect = container.querySelector(
      '#sourceChain',
    ) as HTMLSelectElement;
    expect(sourceChainSelect).toBeTruthy();
    expect(sourceChainSelect.options.length).toBeGreaterThan(0);
  });
});
