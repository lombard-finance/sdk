import { SolanaNetwork, ISolanaWalletProvider } from '../../types';
import { getUnifiedChainId } from '../getUnifiedChainId';
import { signMessage } from '../signMessage';

interface signLbtcDestionationSolanaParams {
  provider: ISolanaWalletProvider;
  network: SolanaNetwork;
}

/**
 * Signs the destination address for the LBTC in active chain
 *
 */
export async function signLbtcDestinationAddrSolana({
  provider,
  network,
}: signLbtcDestionationSolanaParams): Promise<{
  signature: string;
}> {
  const message = `destination chain id is ${getUnifiedChainId(network)}`;

  const { signature } = await signMessage(provider, message);

  return {
    signature,
  };
}
