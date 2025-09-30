import { RpcProvider, WalletAccount } from 'starknet';
import { StarknetChainId } from './chains';

const RPC_PROVIDERS = {
  [StarknetChainId.SN_MAIN]:
    'https://starknet-mainnet.public.blastapi.io/rpc/v0_8',
  [StarknetChainId.SN_SEPOLIA]:
    'https://starknet-sepolia.public.blastapi.io/rpc/v0_8',
};

const providers = new Map<StarknetChainId, RpcProvider>();
export const getRpcProvider = (chainId = StarknetChainId.SN_MAIN) => {
  let provider = providers.get(chainId);
  if (!provider) {
    provider = new RpcProvider({ nodeUrl: RPC_PROVIDERS[chainId] });
    providers.set(chainId, provider);
  }

  return provider;
};

export type ProviderParameters = {
  provider: RpcProvider | WalletAccount;
};
