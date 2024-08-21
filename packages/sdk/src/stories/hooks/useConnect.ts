import Web3 from 'web3';
import { IEIP1193Provider, TChainId } from '../../common/types/types';
import { isValidChain } from '../../common/utils/isValidChain';
import { connectInjectedWallet } from '../utils/connectInjectedWallet';
import { getWalletInfo } from '../utils/getWalletInfo';
import useQuery from './useQuery';

interface IRequestConnect {
  provider: IEIP1193Provider;
  account: string;
  chainId: TChainId;
}

interface IUseConnect {
  data: IRequestConnect | null;
  error: string | null;
  isLoading: boolean;
  connect: () => void;
}

export function useConnect(): IUseConnect {
  const {
    data,
    error,
    isLoading,
    refetch: connect,
  } = useQuery(requestConnect, [], false);

  return {
    data,
    error,
    isLoading,
    connect,
  };
}

async function requestConnect(): Promise<IRequestConnect> {
  const provider = await connectInjectedWallet();
  const web3 = new Web3(provider);
  const { account, chainId } = await getWalletInfo(web3);

  if (!isValidChain(chainId)) {
    throw new Error('Invalid chain');
  }

  return { provider, account, chainId };
}
