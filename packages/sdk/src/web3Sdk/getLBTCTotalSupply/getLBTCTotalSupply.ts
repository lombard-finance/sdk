import { IReadProviderParams, ReadProvider } from '../../provider/ReadProvider';
import { TRpcUrlConfig } from '../../provider/rpcUrlConfig';
import { IEnvParam } from '../../common/types/internalTypes';

import { getLbtcTokenContract } from '../utils/getLbtcTokenContract';

export interface ILBTCTotalSupplyParams extends IEnvParam {
  rpcUrl: string;
  chainId: IReadProviderParams['chainId'];
}

export async function getLBTCTotalSupply({
  env,
  rpcUrl,
  chainId,
}: ILBTCTotalSupplyParams): Promise<string> {
  const rpcUrlConfig: TRpcUrlConfig = { [chainId]: rpcUrl };

  const provider = new ReadProvider({ chainId, rpcUrlConfig });

  const tokenContract = getLbtcTokenContract(provider, env);

  const balance: bigint = await tokenContract.methods.totalSupply().call();

  return balance.toString();
}
