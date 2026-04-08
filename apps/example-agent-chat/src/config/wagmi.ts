import { getDefaultConfig } from "connectkit";
import { createConfig, createStorage, http } from "wagmi";
import { base, baseSepolia, mainnet, sepolia } from "wagmi/chains";

// Mainnet chains first so they are the default connection
export const wagmiConfig = createConfig(
  getDefaultConfig({
    chains: [mainnet, base, sepolia, baseSepolia],
    transports: {
      [mainnet.id]: http(),
      [base.id]: http(),
      [sepolia.id]: http(),
      [baseSepolia.id]: http(),
    },
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
    appName: "Lombard AI Assistant",
    // Use sessionStorage instead of localStorage so wallet state
    // doesn't persist across tabs/sessions, avoiding stale connections
    storage: createStorage({ storage: sessionStorage }),
  }),
);
