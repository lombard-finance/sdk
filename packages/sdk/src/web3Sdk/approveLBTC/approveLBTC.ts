import { IEnvParam } from '../../common/types/internalTypes';
import { toSatoshi } from '../../common/utils/convertSatoshi';
import { IWeb3SendResult, Provider } from '../../provider';
import { IProviderBasedParams } from '../types';
import { getGasMultiplier } from '../utils/getGasMultiplier';
import { getLbtcTokenContract } from '../utils/getLbtcTokenContract';

export interface IApproveLBTCParams extends IProviderBasedParams, IEnvParam {
  /**
   * Spender address
   */
  spender: string;
  /**
   * The amount of LBTC to approve
   */
  amount: number;
}

/**
 * Approves the transfer of a specified amount of LBTC tokens.
 *
 * @param {IApproveLBTCParams} params
 *
 * @returns {Promise<IWeb3SendResult>} transaction promise
 */
export function approveLBTC({
  spender,
  amount,
  env,
  ...providerParams
}: IApproveLBTCParams): Promise<IWeb3SendResult> {
  const provider = new Provider(providerParams);
  const tokenContract = getLbtcTokenContract(provider, env);
  const amountSat = toSatoshi(amount);

  const tx = tokenContract.methods.approve(spender, amountSat);

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
