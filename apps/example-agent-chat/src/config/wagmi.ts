import { createConfig, http } from "wagmi";
import { mainnet, sepolia, base, baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
if (!projectId) {
  console.warn("VITE_WALLETCONNECT_PROJECT_ID not set — WalletConnect will not work");
}

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, base, baseSepolia],
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});
