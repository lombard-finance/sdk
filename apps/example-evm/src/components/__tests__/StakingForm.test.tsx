import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AssetId, Env } from '@lombard.finance/sdk';

import { StakingForm } from '../StakingForm';

describe('EVM StakingForm', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
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

  it('shows wallet icon button and fills address on click', async () => {
    renderForm();

    const walletButton = container.querySelector(
      'button[title="Use wallet address"]',
    );
    expect(walletButton).toBeTruthy();

    await act(async () => {
      walletButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const destInput = container.querySelector(
      '#destAddress',
    ) as HTMLInputElement;
    expect(destInput.value).toBe('0xabc123');
  });

  it('submits form payload after wallet address is filled', async () => {
    const { onSubmit } = renderForm();

    // Click wallet icon button to fill address
    const walletButton = container.querySelector(
      'button[title="Use wallet address"]',
    );
    await act(async () => {
      walletButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(vi.mocked(onSubmit).mock.calls[0][0]).toMatchObject({
      destAddress: '0xabc123',
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

    expect(alertMock).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it('shows chain selector dropdown', () => {
    renderForm();

    const destChainSelect = container.querySelector(
      '#destChain',
    ) as HTMLSelectElement;
    expect(destChainSelect.tagName).toBe('SELECT');
    expect(destChainSelect.options.length).toBeGreaterThan(0);
  });

  it('disables submit when disabled prop is true', () => {
    renderForm({ disabled: true });

    const button = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('shows loading state when isLoading is true', () => {
    renderForm({ isLoading: true });

    const button = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Initializing');
  });
});
