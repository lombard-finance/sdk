import { BlockTag, RpcProvider, WalletAccount } from 'starknet';

import { StarknetChainId } from './chains';

const RPC_PROVIDERS = {
  [StarknetChainId.SN_MAIN]: 'https://rpc.starknet.lava.build:443',
  [StarknetChainId.SN_SEPOLIA]: 'https://starknet-sepolia.drpc.org',
};

const providers = new Map<StarknetChainId, RpcProvider>();
export const getRpcProvider = (
  chainId: StarknetChainId = StarknetChainId.SN_MAIN,
) => {
  let provider = providers.get(chainId);
  if (!provider) {
    // Default reads to the `latest` block: starknet.js defaults calls to the
    // `pending` tag, which some RPC nodes reject with "unknown block tag".
    provider = new RpcProvider({
      nodeUrl: RPC_PROVIDERS[chainId],
      blockIdentifier: BlockTag.LATEST,
    });
    providers.set(chainId, provider);
  }

  return provider;
};

export type ProviderParameters = {
  provider: RpcProvider | WalletAccount;
};
