import { TypedData, TypedDataRevision } from 'starknet';

import { StarknetChainId } from './chains';

export const SIGN_MESSAGE_TYPED_DATA = (
  chainId: StarknetChainId,
  message: string,
): TypedData => ({
  types: {
    PersonalMessage: [{ name: 'message', type: 'string' }],
    StarknetDomain: [
      {
        name: 'name',
        type: 'shortstring',
      },
      {
        name: 'chainId',
        type: 'shortstring',
      },
      {
        name: 'version',
        type: 'shortstring',
      },
    ],
  },
  primaryType: 'PersonalMessage',
  domain: {
    name: 'Lombard Staked Bitcoin',
    version: '1.0.0',
    revision: TypedDataRevision.ACTIVE,
    chainId,
  },
  message: {
    message: message,
  },
});
