import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MIN_STAKE_AMOUNT_BTC } from '@lombard.finance/sdk';

import { StakeAndDeployForm } from '../StakeAndDeployForm';

describe('StakeAndDeployForm', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    // Mock window.ethereum for wallet button visibility
    Object.defineProperty(window, 'ethereum', {
      value: {
        request: vi.fn().mockResolvedValue(['0xabc123']),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    Object.defineProperty(window, 'ethereum', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  function renderForm(
    props: Partial<React.ComponentProps<typeof StakeAndDeployForm>> = {},
  ) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const defaultProps = {
      onSubmit: vi.fn().mockResolvedValue(undefined),
      isLoading: false,
      ...props,
    };

    act(() => {
      root.render(<StakeAndDeployForm {...defaultProps} />);
    });

    return defaultProps;
  }

  it('shows "Stake and Deploy" button', () => {
    renderForm();

    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitButton.textContent).toBe('Stake and Deploy');
    expect(submitButton.disabled).toBe(false);
  });

  it('shows "Processing..." when loading', () => {
    renderForm({ isLoading: true });

    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitButton.textContent).toContain('Processing');
    expect(submitButton.disabled).toBe(true);
  });

  it('shows wallet icon button when ethereum is available', () => {
    renderForm();

    const walletButton = container.querySelector('button[title="Use wallet address"]');
    expect(walletButton).toBeTruthy();
  });

  it('does not show wallet icon button when no ethereum provider', () => {
    Object.defineProperty(window, 'ethereum', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    renderForm();

    const walletButton = container.querySelector('button[title="Use wallet address"]');
    expect(walletButton).toBeFalsy();
  });

  it('fills address when wallet icon button is clicked', async () => {
    renderForm();

    const walletButton = container.querySelector('button[title="Use wallet address"]');

    await act(async () => {
      walletButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const destInput = container.querySelector('#destAddress') as HTMLInputElement;
    expect(destInput.value).toBe('0xabc123');
  });

  it('displays Stake and Deploy heading', () => {
    renderForm();

    const heading = container.querySelector('h2');
    expect(heading?.textContent).toBe('Stake and Deploy');
  });

  it('shows minimum stake amount', () => {
    renderForm();

    expect(container.textContent).toContain(`Minimum: ${MIN_STAKE_AMOUNT_BTC} BTC`);
  });
});
