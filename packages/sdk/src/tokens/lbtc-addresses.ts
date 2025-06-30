import { Address } from 'viem';
import { ChainId } from '../common/chains';
import { Env, DEFAULT_ENV } from '@lombard.finance/sdk-common';

type LbtcContractAddresses = Partial<Record<ChainId, Address>>;

const STAGE_LBTC_CONTRACTS = {
  [ChainId.baseSepoliaTestnet]: '0x731eFa688F3679688cf60A3993b8658138953ED6',
  [ChainId.berachainBartioTestnet]:
    '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',
  [ChainId.binanceSmartChainTestnet]:
    '0x731eFa688F3679688cf60A3993b8658138953ED6',
  [ChainId.holesky]: '0xED7bfd5C1790576105Af4649817f6d35A75CD818',
  // https://github.com/lombard-finance/smart-contracts/blob/2-token-model/devnet.json
  [ChainId.katanaTatara]: '0x731eFa688F3679688cf60A3993b8658138953ED6',
  [ChainId.sepolia]: '0xc47e4b3124597fdf8dd07843d4a7052f2ee80c30',
  [ChainId.sonicBlazeTestnet]: '0x731eFa688F3679688cf60A3993b8658138953ED6',
} as const;

const TESTNET_LBTC_CONTRACTS = {
  [ChainId.berachainBartioTestnet]:
    '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',
  [ChainId.binanceSmartChainTestnet]:
    '0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5',
  [ChainId.holesky]: '0x38A13AB20D15ffbE5A7312d2336EF1552580a4E2',
  // https://github.com/lombard-finance/smart-contracts/blob/main/gastald.json
  [ChainId.katanaTatara]: '0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5',
  [ChainId.sepolia]: '0xc47e4b3124597fdf8dd07843d4a7052f2ee80c30',
  [ChainId.sonicBlazeTestnet]: '0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5',
} as const;

const LBTC_CONTRACTS = {
  [ChainId.ethereum]: '0x8236a87084f8b84306f72007f36f2618a5634494',
  [ChainId.base]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
  [ChainId.berachain]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
  [ChainId.binanceSmartChain]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
  [ChainId.corn]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
  [ChainId.etherlink]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
  // https://github.com/lombard-finance/smart-contracts/blob/main/mainnet.json
  [ChainId.katana]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
  [ChainId.morph]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
  [ChainId.sonic]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
  [ChainId.swell]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
} as const;

/**
 * Gets the collection of LBTC contract addresses based on the provided
 * environment.
 */
export function getLbtcContractAddresses(
  env: Env = DEFAULT_ENV,
): LbtcContractAddresses {
  switch (env) {
    case Env.testnet:
      return TESTNET_LBTC_CONTRACTS;
    case Env.dev:
    case Env.stage:
      return STAGE_LBTC_CONTRACTS;
    case Env.prod:
      return LBTC_CONTRACTS;
  }
}
