import { getDefaultConfig } from "connectkit";
import { createConfig, http } from "wagmi";
import { mainnet, sepolia, base, baseSepolia } from "wagmi/chains";

export const wagmiConfig = createConfig(
  getDefaultConfig({
    chains: [sepolia, mainnet, base, baseSepolia],
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
      [base.id]: http(),
      [baseSepolia.id]: http(),
    },
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
    appName: "Lombard AI Assistant",
  }),
);
