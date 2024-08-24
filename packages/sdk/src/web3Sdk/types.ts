import { IEIP1193Provider, TChainId } from '../common/types/types';

export interface IProviderBasedParams {
  /**
   * The EIP-1193 provider instance.
   */
  provider: IEIP1193Provider;
  /**
   * Current chain ID
   */
  chainId: TChainId;
  /**
   * Current account address
   */
  account: string;
}
