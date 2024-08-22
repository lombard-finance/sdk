import { getOutputScript } from '../../btcSdk/utils/getOutputScript';
import { IEnvParam } from '../../common/types/internalTypes';
import { toSatoshi } from '../../common/utils/convertSatoshi';
import { IWeb3SendResult, Provider } from '../../provider';
import { IProviderBasedParams } from '../types';
import { getGasMultiplier } from '../utils/getGasMultiplier';
import { getLbtcTokenContract } from '../utils/getLbtcTokenContract';

export interface IUnstakeLBTCParams extends IProviderBasedParams, IEnvParam {
  /**
   * The BTC address to send the unstaked BTC to.
   */
  btcAddress: string;
  /**
   * The amount of LBTC to unstake.
   */
  amount: number;
}

/**
 * Unstakes LBTC to the specified BTC address.
 *
 * @param {IUnstakeLBTCParams} params
 *
 * @returns {Promise<IWeb3SendResult>} transaction promise
 */
export function unstakeLBTC({
  btcAddress,
  amount,
  env,
  ...providerParams
}: IUnstakeLBTCParams): Promise<IWeb3SendResult> {
  const provider = new Provider(providerParams);
  const tokenContract = getLbtcTokenContract(provider, env);
  const outputScript = getOutputScript(btcAddress, env);

  const amountSat = toSatoshi(amount);

  const tx = tokenContract.methods.redeem(outputScript, amountSat);

  return provider.sendTransactionAsync(
    provider.account,
    tokenContract.options.address,
    {
      data: tx.encodeABI(),
      estimate: true,
      estimateFee: true,
      gasLimitMultiplier: getGasMultiplier(provider.chainId),
    },
  );
}
