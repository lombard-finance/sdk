import { Abi, Address } from 'viem';
import { ChainId } from '../../common/chains';
import CCIP_BRIDGE_ADAPTER_ABI from '../abi/CCIP_BRIDGE_ADAPTER_ABI.json';
import OFT_BRIDGE_ADAPTER_ABI from '../abi/OFT_BRIDGE_ADAPTER_ABI.json';
import { ContractInfo } from '../../common/contract-info';
import BigNumber from 'bignumber.js';

export const MIN_BRIDGE_AMOUNT = BigNumber(0.000001);

export enum BridgeType {
  /** CCIP - (Chainlink) Cross-Chain Interoperability Protocol */
  CCIP = 'CCIP',

  /** OFT - (LayerZero) Omnichain Fungible Token */
  OFT = 'OFT',
}

const BRIDGE_EXPLORER_URL_MAP = {
  [BridgeType.CCIP]: 'https://ccip.chain.link/tx/{txHash}',
  [BridgeType.OFT]: 'https://layerzeroscan.com/tx/{txHash}',
};

export const CCIP_BRIDGE_CHAINS = [
  // Mainnets:
  ChainId.ethereum,
  ChainId.base,
  ChainId.binanceSmartChain,
  // Testnets:
  ChainId.baseSepoliaTestnet,
  ChainId.holesky,
];
export type CCIPBridgeChain = (typeof CCIP_BRIDGE_CHAINS)[number];

export const OFT_BRIDGE_CHAINS = [
  // Mainnets:
  ChainId.ethereum,
  ChainId.berachain,
  ChainId.corn,
  ChainId.etherlink,
  ChainId.sonic,
  ChainId.swell,
  // Testnets:
  ChainId.berachainBartioTestnet,
  ChainId.sepolia,
];

export const OFT_GAS_LIMIT = 90_000;
export const OFT_HI_GAS_LIMIT = 200_000;
export const OFT_HI_GAS_LIMIT_CHAINS = [
  // Mainnets:
  ChainId.berachain,
  ChainId.sonic,
  // Testnets:
  ChainId.berachainBartioTestnet,
];

export type OFTBridgeChain = (typeof OFT_BRIDGE_CHAINS)[number];

type BridgeIdentifier<Ch extends CCIPBridgeChain | OFTBridgeChain> =
  `[from:${Ch}, to: ${Ch}]`;

const bridgeIdentifier = <Ch extends CCIPBridgeChain | OFTBridgeChain>([
  from,
  to,
]: [from: Ch, to: Ch]): BridgeIdentifier<Ch> => `[from:${from}, to: ${to}]`;

type BridgeInfo = { type: BridgeType; contract: ContractInfo };

type CCIPBridgesConfig = [
  BridgeIdentifier<CCIPBridgeChain>,
  { type: BridgeType.CCIP; contract: ContractInfo },
];

const CCIP_BRIDGES: CCIPBridgesConfig[] = [
  // Mainnets:

  [
    bridgeIdentifier([ChainId.ethereum, ChainId.base]),
    {
      type: BridgeType.CCIP,
      contract: {
        address: '0xa869817b48b25eee986bdf4be04062e6fd2c418b',
        abi: CCIP_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.ethereum,
      },
    },
  ],
  [
    bridgeIdentifier([ChainId.ethereum, ChainId.binanceSmartChain]),
    {
      type: BridgeType.CCIP,
      contract: {
        address: '0xa869817b48b25eee986bdf4be04062e6fd2c418b',
        abi: CCIP_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.ethereum,
      },
    },
  ],

  [
    bridgeIdentifier([ChainId.base, ChainId.ethereum]),
    {
      type: BridgeType.CCIP,
      contract: {
        address: '0xa869817b48b25eee986bdf4be04062e6fd2c418b',
        abi: CCIP_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.base,
      },
    },
  ],
  [
    bridgeIdentifier([ChainId.base, ChainId.binanceSmartChain]),
    {
      type: BridgeType.CCIP,
      contract: {
        address: '0xa869817b48b25eee986bdf4be04062e6fd2c418b',
        abi: CCIP_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.base,
      },
    },
  ],

  [
    bridgeIdentifier([ChainId.binanceSmartChain, ChainId.ethereum]),
    {
      type: BridgeType.CCIP,
      contract: {
        address: '0xa869817b48b25eee986bdf4be04062e6fd2c418b',
        abi: CCIP_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.binanceSmartChain,
      },
    },
  ],
  [
    bridgeIdentifier([ChainId.binanceSmartChain, ChainId.base]),
    {
      type: BridgeType.CCIP,
      contract: {
        address: '0xa869817b48b25eee986bdf4be04062e6fd2c418b',
        abi: CCIP_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.binanceSmartChain,
      },
    },
  ],

  // Testnets:

  [
    bridgeIdentifier([ChainId.baseSepoliaTestnet, ChainId.holesky]),
    {
      type: BridgeType.CCIP,
      contract: {
        address: '0x38247C4c846D549CAAd2C6c0b6fec0c402b77a0F',
        abi: CCIP_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.baseSepoliaTestnet,
      },
    },
  ],

  [
    bridgeIdentifier([ChainId.holesky, ChainId.baseSepoliaTestnet]),
    {
      type: BridgeType.CCIP,
      contract: {
        address: '0x38247C4c846D549CAAd2C6c0b6fec0c402b77a0F',
        abi: CCIP_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.holesky,
      },
    },
  ],
];

type OFTBridgeConfig = [
  BridgeIdentifier<OFTBridgeChain>,
  { type: BridgeType.OFT; contract: ContractInfo },
];
const OFT_BRIDGES: OFTBridgeConfig[] = [
  // Mainnets:

  [
    bridgeIdentifier([ChainId.ethereum, ChainId.berachain]),
    {
      type: BridgeType.OFT,
      contract: {
        address: '0x1290A6b480f7eF14925229fdB66f5680aD8F44AD',
        abi: OFT_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.ethereum,
      },
    },
  ],
  [
    bridgeIdentifier([ChainId.ethereum, ChainId.corn]),
    {
      type: BridgeType.OFT,
      contract: {
        address: '0x6bc15d7930839ec18a57f6f7df72ae1b439d077f',
        abi: OFT_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.ethereum,
      },
    },
  ],
  [
    bridgeIdentifier([ChainId.ethereum, ChainId.etherlink]),
    {
      type: BridgeType.OFT,
      contract: {
        address: '0x3a7647c1323144a16e7D0D71A581E3FE5BD95299',
        abi: OFT_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.ethereum,
      },
    },
  ],
  [
    bridgeIdentifier([ChainId.ethereum, ChainId.sonic]),
    {
      type: BridgeType.OFT,
      contract: {
        address: '0xcFEAc622BC6464acC759ACd9741a6D78F8b0d3Cd',
        abi: OFT_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.ethereum,
      },
    },
  ],
  [
    bridgeIdentifier([ChainId.ethereum, ChainId.swell]),
    {
      type: BridgeType.OFT,
      contract: {
        address: '0x37E92d760a15231e652a2C502182a6b44c7510c0',
        abi: OFT_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.ethereum,
      },
    },
  ],

  [
    bridgeIdentifier([ChainId.berachain, ChainId.ethereum]),
    {
      type: BridgeType.OFT,
      contract: {
        address: '0x630e12D53D4E041b8C5451aD035Ea841E08391d7',
        abi: OFT_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.berachain,
      },
    },
  ],

  [
    bridgeIdentifier([ChainId.corn, ChainId.ethereum]),
    {
      type: BridgeType.OFT,
      contract: {
        address: '0xfc7B20D9B59A8A466f4fC3d34aA69a7D98e71d7A',
        abi: OFT_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.corn,
      },
    },
  ],

  [
    bridgeIdentifier([ChainId.etherlink, ChainId.ethereum]),
    {
      type: BridgeType.OFT,
      contract: {
        address: '0xC832183d4d5fc5831daaC892a93dBBfd798034E3',
        abi: OFT_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.etherlink,
      },
    },
  ],

  [
    bridgeIdentifier([ChainId.sonic, ChainId.ethereum]),
    {
      type: BridgeType.OFT,
      contract: {
        address: '0x630e12D53D4E041b8C5451aD035Ea841E08391d7',
        abi: OFT_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.sonic,
      },
    },
  ],

  [
    bridgeIdentifier([ChainId.swell, ChainId.ethereum]),
    {
      type: BridgeType.OFT,
      contract: {
        address: '0x7B3784AD646C10A8Ddf42b47a4f4bd9aFD351E54',
        abi: OFT_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.swell,
      },
    },
  ],

  // Testnets:

  [
    bridgeIdentifier([ChainId.berachainBartioTestnet, ChainId.sepolia]),
    {
      type: BridgeType.OFT,
      contract: {
        address: '0x1977013acaf27856ac8048C42EE2ed0134d53895',
        abi: OFT_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.berachainBartioTestnet,
      },
    },
  ],

  [
    bridgeIdentifier([ChainId.sepolia, ChainId.berachainBartioTestnet]),
    {
      type: BridgeType.OFT,
      contract: {
        address: '0xe3748bF0Ec0A76767539eE28610B3367e35fe2C2',
        abi: OFT_BRIDGE_ADAPTER_ABI as Abi,
        chainId: ChainId.sepolia,
      },
    },
  ],
];

export const BRIDGES = new Map<
  BridgeIdentifier<CCIPBridgeChain | OFTBridgeChain>,
  BridgeInfo
>([...CCIP_BRIDGES, ...OFT_BRIDGES]);

/** Gets the bridge information */
export const getBridgeInfo = (
  from: CCIPBridgeChain | OFTBridgeChain,
  to: CCIPBridgeChain | OFTBridgeChain,
) => {
  return BRIDGES.get(bridgeIdentifier([from, to]));
};
