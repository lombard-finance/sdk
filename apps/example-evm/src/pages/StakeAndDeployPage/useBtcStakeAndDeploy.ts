import { Chain, createConfig, DeployProtocol, Env } from '@lombard.finance/sdk';
import {
  useBtcStakeAndBake as useBtcStakeAndBakeHook,
  useLombardSDK,
} from '@lombard.finance/sdk-react';
import { useCallback } from 'react';

import { getEnvironment } from '../../lib/config';

export type { StakeAndBakeStatus } from '@lombard.finance/sdk-react';
export type { StakeAndBakeProgressInfo as StakeAndBakeProgress } from '@lombard.finance/sdk-react';

/**
 * Hook for managing Stake-and-Deploy flow (BTC → LBTC → Vault)
 *
 * Combines staking and vault deployment in a single atomic operation
 *
 * @param protocol - DeFi protocol to deploy to (Veda or Silo)
 * @param partnerId - Partner ID to bypass reCAPTCHA (required without captcha integration)
 * @param env - Environment (prod, testnet, stage)
 */
export function useBtcStakeAndDeploy(
  protocol: DeployProtocol,
  partnerId?: string,
  env?: Env,
) {
  const currentEnv = env ?? getEnvironment();

  const {
    sdk,
    isInitializing,
    error: sdkError,
  } = useLombardSDK(
    () =>
      createConfig({
        env: currentEnv,
        providers: {
          ...(window.ethereum && { evm: () => window.ethereum! }),
        },
        ...(partnerId && { partner: { partnerId } }),
      }),
    // protocol is part of the public interface; include in deps for future use
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [partnerId, currentEnv, protocol],
  );

  const {
    stakeAndDeploy: stakeAndDeployCore,
    reset,
    depositAddress,
    stakeAmount,
    status,
    progress,
    error: snbError,
  } = useBtcStakeAndBakeHook(sdk);

  const sourceChain =
    currentEnv === Env.prod ? Chain.BITCOIN_MAINNET : Chain.BITCOIN_SIGNET;

  const stakeAndDeploy = useCallback(
    (params: {
      amount: string;
      recipient: string;
      destChain: Chain;
      protocol: DeployProtocol;
      referralCode?: string;
    }) =>
      stakeAndDeployCore({
        amount: params.amount,
        destChain: params.destChain,
        sourceChain,
        protocol: params.protocol,
        recipient: params.recipient,
        ...(params.referralCode && { referralCode: params.referralCode }),
      }),
    [stakeAndDeployCore, sourceChain],
  );

  return {
    sdk,
    stakeAndDeploy,
    reset,
    isInitializing,
    error: sdkError ?? snbError,
    depositAddress,
    stakeAmount,
    status,
    progress,
  };
}
