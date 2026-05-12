import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AssetId, Chain, Env } from '@lombard.finance/sdk';

import { StakingForm } from '../StakingForm';

describe('Starknet StakingForm', () => {
  let root: Root;
  let container: HTMLDivElement;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
  });

  function renderForm(
    props: Partial<React.ComponentProps<typeof StakingForm>> = {},
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
      root.render(<StakingForm {...defaultProps} />);
    });

    return defaultProps;
  }

  it('submits form payload with auto-filled starknet address', async () => {
    const { onSubmit } = renderForm({ solanaAddress: '0xstarknet123' });

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(vi.mocked(onSubmit).mock.calls[0][0]).toMatchObject({
      destAddress: '0xstarknet123',
      assetOut: AssetId.LBTC,
    });
  });

  it('alerts when submitting without destination address', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { onSubmit } = renderForm();

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });

    expect(alertMock).toHaveBeenCalledWith(
      'Please enter your destination address',
    );
    expect(onSubmit).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it('shows fixed chain when fixedDestChain is provided', () => {
    renderForm({ fixedDestChain: Chain.STARKNET_SEPOLIA });

    // Should show disabled input instead of select
    const destChainInput = container.querySelector(
      '#destChain',
    ) as HTMLInputElement;
    expect(destChainInput.disabled).toBe(true);
    expect(destChainInput.tagName).toBe('INPUT');
  });

  it('shows chain dropdown when fixedDestChain is not provided', () => {
    renderForm();

    const destChainSelect = container.querySelector(
      '#destChain',
    ) as HTMLSelectElement;
    expect(destChainSelect.tagName).toBe('SELECT');
  });

  it('disables submit button when disabled prop is true', () => {
    renderForm({ disabled: true });

    const button = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Connect Wallet');
  });

  it('disables submit button when loading', () => {
    renderForm({ isLoading: true });

    const button = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Initializing');
  });

  it('shows wallet icon button when starknet address is available', () => {
    renderForm({ solanaAddress: '0xmyaddress' });

    const walletButton = container.querySelector(
      'button[title="Use wallet address"]',
    );
    expect(walletButton).toBeTruthy();
  });
});
