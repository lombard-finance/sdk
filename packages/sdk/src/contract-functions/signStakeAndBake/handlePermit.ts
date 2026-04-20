import { makeWalletClient } from '../../clients/wallet-client';
import { ChainId } from '../../common/chains';
import {
  ISignStakeAndBakeParams,
  ISignStakeAndBakeResult,
} from './signStakeAndBake';
import { buildTypedData, serializeTypedData } from './typed-data-builder';

/**
 * Handle permit flow (off-chain signature).
 * Signs EIP-2612 typed data for gasless approval.
 */
export async function handlePermitFlow(params: {
  chainId: ChainId;
  provider: ISignStakeAndBakeParams['provider'];
  typedData: ReturnType<typeof buildTypedData>;
}): Promise<ISignStakeAndBakeResult> {
  const { chainId, provider, typedData } = params;

  const walletClient = makeWalletClient({ chainId, provider });
  const signature = await walletClient.signTypedData(typedData);

  return {
    mode: 'permit',
    signature,
    typedData: serializeTypedData(typedData),
  };
}
