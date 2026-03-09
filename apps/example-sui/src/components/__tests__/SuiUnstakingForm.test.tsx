import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Chain, Env } from '@lombard.finance/sdk';

import { SuiUnstakingForm } from '../SuiUnstakingForm';

describe('SuiUnstakingForm', () => {
  let root: Root;
  let container: HTMLDivElement;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
  });

  function renderForm(
    props: Partial<React.ComponentProps<typeof SuiUnstakingForm>> = {},
  ) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const defaultProps = {
      env: Env.stage,
      onSubmit: vi.fn().mockResolvedValue(undefined),
      isLoading: false,
      suiAddress: '0xsuiaddress123',
      ...props,
    };

    act(() => {
      root.render(<SuiUnstakingForm {...defaultProps} />);
    });

    return defaultProps;
  }

  it('validates recipient before submit', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { onSubmit } = renderForm();

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Please enter your Bitcoin address');
    alertSpy.mockRestore();
  });

  it('shows testnet chains for non-prod env', () => {
    renderForm({ env: Env.testnet });

    const sourceInput = container.querySelector('#sourceChain') as HTMLInputElement;
    const destInput = container.querySelector('#destChain') as HTMLInputElement;
    expect(sourceInput.value).toBe('Sui Testnet');
    expect(destInput.value).toBe('Bitcoin Signet');
  });

  it('shows mainnet chains for prod env', () => {
    renderForm({ env: Env.prod });

    const sourceInput = container.querySelector('#sourceChain') as HTMLInputElement;
    const destInput = container.querySelector('#destChain') as HTMLInputElement;
    expect(sourceInput.value).toBe('Sui Mainnet');
    expect(destInput.value).toBe('Bitcoin Mainnet');
  });

  it('disables submit when no sui wallet connected', () => {
    renderForm({ suiAddress: undefined, disabled: true });

    const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Connect Sui Wallet');
  });

  it('shows connected wallet address', () => {
    renderForm({ suiAddress: '0xabc12345def67890' });

    const walletInfo = container.querySelector('.bg-green-50');
    expect(walletInfo?.textContent).toContain('0xabc123');
    expect(walletInfo?.textContent).toContain('67890');
  });

  it('submits correct chain IDs for testnet', async () => {
    const { onSubmit } = renderForm({ env: Env.testnet });

    // Fill recipient
    const recipientInput = container.querySelector('#recipient') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype, 'value',
      )?.set;
      setter?.call(recipientInput, 'tb1qtest');
      recipientInput.dispatchEvent(new Event('input', { bubbles: true }));
      recipientInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(vi.mocked(onSubmit).mock.calls[0][0]).toMatchObject({
      sourceChain: Chain.SUI_TESTNET,
      destChain: Chain.BITCOIN_SIGNET,
    });
  });
});
