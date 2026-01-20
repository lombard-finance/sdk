import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { avalanche, avalancheFuji } from '@wagmi/core/chains';
import { ReactNode } from 'react';
import { createConfig, http, WagmiProvider } from 'wagmi';
import {
  base,
  baseSepolia,
  berachain,
  berachainTestnetbArtio,
  bsc,
  bscTestnet,
  corn,
  holesky,
  mainnet,
  morph,
  morphHolesky,
  sepolia,
  sonic,
  sonicBlazeTestnet,
  swellchain,
} from 'wagmi/chains';

import { rpcUrlConfig } from '../../../clients/rpc-url-config';
import { katana, katanaTatara, tac } from '../../../common/chains';

const config = createConfig({
  chains: [
    mainnet,
    base,
    berachain,
    bsc,
    corn,
    katana,
    morph,
    sonic,
    swellchain,
    tac,
    avalanche,
    // Testnets:
    baseSepolia,
    berachainTestnetbArtio,
    bscTestnet,
    holesky,
    katanaTatara,
    morphHolesky,
    sepolia,
    sonicBlazeTestnet,
    avalancheFuji,
  ],
  transports: {
    [mainnet.id]: http(rpcUrlConfig[mainnet.id]),
    [base.id]: http(rpcUrlConfig[base.id]),
    [berachain.id]: http(rpcUrlConfig[berachain.id]),
    [bsc.id]: http(rpcUrlConfig[bsc.id]),
    [corn.id]: http(rpcUrlConfig[corn.id]),
    [katana.id]: http(rpcUrlConfig[katana.id]),
    [morph.id]: http(rpcUrlConfig[morph.id]),
    [sonic.id]: http(rpcUrlConfig[sonic.id]),
    [swellchain.id]: http(rpcUrlConfig[swellchain.id]),
    [tac.id]: http(rpcUrlConfig[tac.id]),
    [avalanche.id]: http(rpcUrlConfig[avalanche.id]),
    // Testnets:
    [baseSepolia.id]: http(rpcUrlConfig[baseSepolia.id]),
    [berachainTestnetbArtio.id]: http(rpcUrlConfig[berachainTestnetbArtio.id]),
    [bscTestnet.id]: http(rpcUrlConfig[bscTestnet.id]),
    [holesky.id]: http(rpcUrlConfig[holesky.id]),
    [katanaTatara.id]: http(rpcUrlConfig[katanaTatara.id]),
    [morphHolesky.id]: http(rpcUrlConfig[morphHolesky.id]),
    [sepolia.id]: http(rpcUrlConfig[sepolia.id]),
    [sonicBlazeTestnet.id]: http(rpcUrlConfig[sonicBlazeTestnet.id]),
    [avalancheFuji.id]: http(rpcUrlConfig[avalancheFuji.id]),
  },
});

const queryClient = new QueryClient();

export function ConnectionProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>{children}</WagmiProvider>
    </QueryClientProvider>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const wagmiDecorator = (Story: any) => {
  return (
    <ConnectionProvider>
      <Story />
    </ConnectionProvider>
  );
};
