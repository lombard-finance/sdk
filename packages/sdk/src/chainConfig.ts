interface ChainConfig {
  name: string;
  baseUrl: string;
}

export const supportedChains: Record<number, ChainConfig> = {
  1: {
    name: 'Ethereum Mainnet',
    baseUrl: 'https://mainnet.prod.lombard.finance',
  },
  17000: {
    name: 'Ethereum Holesky',
    baseUrl: 'https://staging.prod.lombard.finance',
  },
};
