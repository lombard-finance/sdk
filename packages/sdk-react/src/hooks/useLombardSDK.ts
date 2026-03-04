import { createLombardSDK, type LombardConfig, type LombardSDK } from '@lombard.finance/sdk';
import { type DependencyList, useEffect, useState } from 'react';

export interface UseLombardSDKReturn {
  sdk: LombardSDK | null;
  isInitializing: boolean;
  error: string | null;
}

/**
 * Hook for initializing and managing a LombardSDK instance.
 *
 * Takes a factory function that returns a LombardConfig (or undefined if not ready,
 * e.g. wallet not yet connected). Re-initializes whenever the deps array changes.
 *
 * @param configFn - Factory returning a LombardConfig or undefined
 * @param deps - Dependency list controlling re-initialization
 *
 * @example
 * ```ts
 * const { sdk, isInitializing, error } = useLombardSDK(
 *   () => !window.ethereum ? undefined : createConfig({
 *     env,
 *     providers: { evm: () => window.ethereum! },
 *   }),
 *   [env],
 * );
 * ```
 */
export function useLombardSDK(
  configFn: () => LombardConfig | undefined,
  deps: DependencyList,
): UseLombardSDKReturn {
  const [sdk, setSdk] = useState<LombardSDK | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initSdk() {
      let config: LombardConfig | undefined;

      try {
        config = configFn();
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize SDK');
          setIsInitializing(false);
        }
        return;
      }

      if (!config) {
        if (mounted) {
          setSdk(null);
          setError(null);
          setIsInitializing(false);
        }
        return;
      }

      try {
        setIsInitializing(true);

        const lombard = await createLombardSDK(config);

        if (mounted) {
          setSdk(lombard);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to initialize SDK',
          );
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    }

    initSdk();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { sdk, isInitializing, error };
}
