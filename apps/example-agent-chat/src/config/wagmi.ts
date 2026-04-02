import { createConfig, http } from "wagmi";
import { mainnet, sepolia, base, baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "demo";

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, base, baseSepolia],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});
