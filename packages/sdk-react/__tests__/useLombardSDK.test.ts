import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLombardSDK } from '../src/hooks/useLombardSDK';

const mockSdk = { chain: {} };
const mockCreateLombardSDK = vi.fn();

vi.mock('@lombard.finance/sdk', async importOriginal => {
  const actual = await importOriginal<typeof import('@lombard.finance/sdk')>();
  return {
    ...actual,
    createLombardSDK: (...args: unknown[]) => mockCreateLombardSDK(...args),
  };
});

const mockConfig = { env: 'testnet' } as never;

describe('useLombardSDK', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateLombardSDK.mockResolvedValue(mockSdk);
  });

  it('initializes SDK when configFn returns a config', async () => {
    const { result } = renderHook(() =>
      useLombardSDK(() => mockConfig, []),
    );

    expect(result.current.isInitializing).toBe(true);

    await waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    expect(mockCreateLombardSDK).toHaveBeenCalledWith(mockConfig);
    expect(result.current.sdk).toBe(mockSdk);
    expect(result.current.error).toBeNull();
  });

  it('skips initialization when configFn returns undefined', async () => {
    const { result } = renderHook(() =>
      useLombardSDK(() => undefined, []),
    );

    await waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    expect(mockCreateLombardSDK).not.toHaveBeenCalled();
    expect(result.current.sdk).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets error when createLombardSDK rejects', async () => {
    mockCreateLombardSDK.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useLombardSDK(() => mockConfig, []),
    );

    await waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    expect(result.current.sdk).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('reinitializes when deps change', async () => {
    const secondSdk = { chain: { evm: {} } };
    mockCreateLombardSDK
      .mockResolvedValueOnce(mockSdk)
      .mockResolvedValueOnce(secondSdk);

    const { result, rerender } = renderHook(
      ({ dep }: { dep: string }) =>
        useLombardSDK(() => mockConfig, [dep]),
      { initialProps: { dep: 'v1' } },
    );

    await waitFor(() => expect(result.current.sdk).toBe(mockSdk));

    rerender({ dep: 'v2' });

    await waitFor(() => expect(result.current.sdk).toBe(secondSdk));

    expect(mockCreateLombardSDK).toHaveBeenCalledTimes(2);
  });

  it('ignores stale response after unmount', async () => {
    let resolveInit!: (value: unknown) => void;
    mockCreateLombardSDK.mockReturnValue(
      new Promise(resolve => {
        resolveInit = resolve;
      }),
    );

    const { result, unmount } = renderHook(() =>
      useLombardSDK(() => mockConfig, []),
    );

    unmount();
    resolveInit(mockSdk);

    // State should remain null because component was unmounted
    expect(result.current.sdk).toBeNull();
  });

  it('sets error when configFn throws synchronously', async () => {
    const { result } = renderHook(() =>
      useLombardSDK(() => {
        throw new Error('Bad config');
      }, []),
    );

    await waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    expect(mockCreateLombardSDK).not.toHaveBeenCalled();
    expect(result.current.sdk).toBeNull();
    expect(result.current.error).toBe('Bad config');
  });

  it('resets sdk and error when config transitions to undefined', async () => {
    const { result, rerender } = renderHook(
      ({ ready }: { ready: boolean }) =>
        useLombardSDK(() => (ready ? mockConfig : undefined), [ready]),
      { initialProps: { ready: true } },
    );

    await waitFor(() => expect(result.current.sdk).toBe(mockSdk));

    rerender({ ready: false });

    await waitFor(() => {
      expect(result.current.sdk).toBeNull();
      expect(result.current.isInitializing).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
