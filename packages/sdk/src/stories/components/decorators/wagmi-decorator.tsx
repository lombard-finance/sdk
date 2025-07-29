import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
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
import { createConfig, http, WagmiProvider } from 'wagmi';
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
    // Testnets:
    baseSepolia,
    berachainTestnetbArtio,
    bscTestnet,
    holesky,
    katanaTatara,
    morphHolesky,
    sepolia,
    sonicBlazeTestnet,
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
    // Testnets:
    [baseSepolia.id]: http(rpcUrlConfig[baseSepolia.id]),
    [berachainTestnetbArtio.id]: http(rpcUrlConfig[berachainTestnetbArtio.id]),
    [bscTestnet.id]: http(rpcUrlConfig[bscTestnet.id]),
    [holesky.id]: http(rpcUrlConfig[holesky.id]),
    [katanaTatara.id]: http(rpcUrlConfig[katanaTatara.id]),
    [morphHolesky.id]: http(rpcUrlConfig[morphHolesky.id]),
    [sepolia.id]: http(rpcUrlConfig[sepolia.id]),
    [sonicBlazeTestnet.id]: http(rpcUrlConfig[sonicBlazeTestnet.id]),
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

// biome-ignore lint/suspicious/noExplicitAny: Story is a storybooks story element
export const wagmiDecorator = (Story: any) => {
  return (
    <ConnectionProvider>
      <Story />
    </ConnectionProvider>
  );
};
