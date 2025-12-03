import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import { Contract, TypedContractV2 } from 'starknet';

import { ChainParameters, StarknetChainId } from '../../utils/chains';
import { EnvParameters } from '../../utils/env';
import { ERR_NO_PROVIDER, ERR_NO_TOKEN } from '../../utils/err';
import { getRpcProvider, ProviderParameters } from '../../utils/rpc-providers';
import ERC20_ABI from '../abi/ERC20_ABI';
import LBTC_ABI from '../abi/LBTC_ABI';
import LBTC_BASCULE_ABI from '../abi/LBTC_BASCULE_ABI';
import LBTC_BRIDGE_ABI from '../abi/LBTC_BRIDGE_ABI';

export enum Token {
  ETH = 'ETH',
  LBTC = 'LBTC',
  STRK = 'STRK',
}

const ETH_TOKEN_CONFIG = {
  [StarknetChainId.SN_SEPOLIA]: {
    address:
      '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    classHash:
      '0x076791ef97c042f81fbf352ad95f39a22554ee8d7927b2ce3c681f3418b5206a',
    abi: ERC20_ABI,
  },
  [StarknetChainId.SN_MAIN]: {
    address:
      '0x049D36570D4e46f48e99674bd3fcc84644DdD6b96F7C741B1562B82f9e004dC7',
    classHash: '',
    abi: ERC20_ABI,
  },
} as const;

const LBTC_TOKEN_CONFIG = {
  [Env.stage]: {
    [StarknetChainId.SN_SEPOLIA]: {
      address:
        '0x00b442f5420860e937a99659326e81a97e07bfd538b3cee65b90029c9da38a5f',
      classHash:
        '0x01f12942315b6dd05a21392ced7890a380affa81066741de6ac31af4dcb0d468',
      abi: LBTC_ABI,
    },
    [StarknetChainId.SN_MAIN]: undefined,
  },
  [Env.testnet]: {
    [StarknetChainId.SN_SEPOLIA]: {
      address:
        '0x00456a829ab75ba5e97534dc70d7fc617cfda244f8dcda47b11624de67c6e70c',
      classHash:
        '0x01f12942315b6dd05a21392ced7890a380affa81066741de6ac31af4dcb0d468',
      abi: LBTC_ABI,
    },
    [StarknetChainId.SN_MAIN]: undefined,
  },
  [Env.dev]: {
    [StarknetChainId.SN_SEPOLIA]: {
      address:
        '0x0723de0c550b7bfbb5051dade72966d71a08bef952c0197462a5244497eb57c1',
      classHash:
        '0x01f12942315b6dd05a21392ced7890a380affa81066741de6ac31af4dcb0d468',
      abi: LBTC_ABI,
    },
    [StarknetChainId.SN_MAIN]: undefined,
  },
  [Env.prod]: {
    [StarknetChainId.SN_SEPOLIA]: undefined,
    [StarknetChainId.SN_MAIN]: {
      address:
        '0x036834a40984312f7f7de8d31e3f6305b325389eaeea5b1c0664b2fb936461a4',
      classHash: '',
      abi: LBTC_ABI,
    },
  },
  [Env.ibc]: undefined,
} as const;

const LBTC_BRIDGE_CONFIG = {
  [Env.stage]: {
    [StarknetChainId.SN_SEPOLIA]: {
      address:
        '0x01d27f156092746d0d7cd9d9deec5e937f27c3c7c1c28365e9e5efac459880b3',
      classHash:
        '0x0524d80f999f690bbb302f37a36abdf82ea2135391c3d1a5090e7665c20e2159',
      abi: LBTC_BRIDGE_ABI,
    },
    [StarknetChainId.SN_MAIN]: undefined,
  },
  [Env.testnet]: {
    [StarknetChainId.SN_SEPOLIA]: {
      address:
        '0x063b7b5c8b114ebd5b9602fbd5d0ffd2cc3a598f1d91c6904cc0997cd8fea760',
      classHash:
        '0x0524d80f999f690bbb302f37a36abdf82ea2135391c3d1a5090e7665c20e2159',
      abi: LBTC_BRIDGE_ABI,
    },
    [StarknetChainId.SN_MAIN]: undefined,
  },
  [Env.dev]: {
    [StarknetChainId.SN_SEPOLIA]: {
      address:
        '0x04838a05c798dc57e01e85526979841c84f1f3c732a525cff53adb3e8bee3d24',
      classHash:
        '0x0524d80f999f690bbb302f37a36abdf82ea2135391c3d1a5090e7665c20e2159',
      abi: LBTC_BRIDGE_ABI,
    },
    [StarknetChainId.SN_MAIN]: undefined,
  },
  [Env.prod]: {
    [StarknetChainId.SN_SEPOLIA]: undefined,
    [StarknetChainId.SN_MAIN]: {
      address:
        '0x05b1886d0f844ab930fc0ee066f1655a873437f15a5d2c41ee3e884fd5299976',
      classHash: '',
      abi: LBTC_BRIDGE_ABI,
    },
  },
  [Env.ibc]: undefined,
} as const;

const LBTC_BASCULE_CONFIG = {
  [Env.stage]: {
    [StarknetChainId.SN_SEPOLIA]: {
      address:
        '0x001d16d02a4ed6f5673635b1ad3b27ead190904b83fafde7b4c55282ef57492a',
      classHash:
        '0x0083965992f591e5979068d8a12a09a1f13949e1d1f65f495e7a5503d2f1e519',
      abi: LBTC_BASCULE_ABI,
    },
    [StarknetChainId.SN_MAIN]: undefined,
  },
  [Env.testnet]: {
    [StarknetChainId.SN_SEPOLIA]: {
      address:
        '0x01757fb630a6cc4e3607fc1d92e0f91c5b3eedd71420f1fa7dc6d1764827b012',
      classHash:
        '0x0083965992f591e5979068d8a12a09a1f13949e1d1f65f495e7a5503d2f1e519',
      abi: LBTC_BASCULE_ABI,
    },
    [StarknetChainId.SN_MAIN]: undefined,
  },
  [Env.dev]: {
    [StarknetChainId.SN_SEPOLIA]: {
      address:
        '0x01757fb630a6cc4e3607fc1d92e0f91c5b3eedd71420f1fa7dc6d1764827b012',
      classHash:
        '0x0083965992f591e5979068d8a12a09a1f13949e1d1f65f495e7a5503d2f1e519',
      abi: LBTC_BASCULE_ABI,
    },
    [StarknetChainId.SN_MAIN]: undefined,
  },
  [Env.prod]: {
    [StarknetChainId.SN_SEPOLIA]: undefined,
    [StarknetChainId.SN_MAIN]: {
      address:
        '0x76b68231c1bddb7c981c5a19d9c6a28c5cb14161b8fcd3a857aa8a396d31f95',
      classHash: '',
      abi: LBTC_BASCULE_ABI,
    },
  },
  [Env.ibc]: undefined,
} as const;

const STRK_TOKEN_CONFIG = {
  [StarknetChainId.SN_SEPOLIA]: {
    address:
      '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    classHash:
      '0x009524a94b41c4440a16fd96d7c1ef6ad6f44c1c013e96662734502cd4ee9b1f',
    abi: ERC20_ABI,
  },
  [StarknetChainId.SN_MAIN]: {
    address:
      '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    classHash:
      '0x009524a94b41c4440a16fd96d7c1ef6ad6f44c1c013e96662734502cd4ee9b1f',
    abi: ERC20_ABI,
  },
} as const;

export const getTokenInfo = (
  token: Token,
  chain: StarknetChainId = StarknetChainId.SN_MAIN,
  contractType: 'token' | 'bridge' | 'bascule' = 'token',
  env = DEFAULT_ENV,
) => {
  if (contractType === 'bridge') {
    switch (token) {
      case Token.LBTC:
        return LBTC_BRIDGE_CONFIG?.[env]?.[chain];
      default:
        return undefined;
    }
  }

  if (contractType === 'bascule') {
    switch (token) {
      case Token.LBTC:
        return LBTC_BASCULE_CONFIG?.[env]?.[chain];
      default:
        return undefined;
    }
  }

  // token contracts

  switch (token) {
    case Token.ETH:
      return ETH_TOKEN_CONFIG[chain];
    case Token.LBTC:
      return LBTC_TOKEN_CONFIG?.[env]?.[chain];
    case Token.STRK:
      return STRK_TOKEN_CONFIG[chain];
  }
};

export type TokenParameters = {
  /** The token identifier. */
  token: Token;
};

/** Gets the token contract */
export const getTokenContract = ({
  token,
  chainId,
  provider: _provider,
  contractType = 'token',
  env,
}: TokenParameters &
  ChainParameters &
  ProviderParameters &
  EnvParameters & {
    contractType: 'token' | 'bridge' | 'bascule';
  }) => {
  const tokenInfo = getTokenInfo(token, chainId, contractType, env);
  if (!tokenInfo) {
    throw ERR_NO_TOKEN(token);
  }

  const provider = _provider || getRpcProvider(chainId);
  if (!provider) {
    throw ERR_NO_PROVIDER(chainId);
  }

  const contract = new Contract(
    tokenInfo.abi,
    tokenInfo.address,
    provider,
  ) as TypedContractV2<typeof tokenInfo.abi>;
  return contract;
};
