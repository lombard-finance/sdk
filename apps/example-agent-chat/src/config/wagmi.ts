import { getDefaultConfig } from "connectkit";
import { createConfig, createStorage, http } from "wagmi";
import { base, baseSepolia, mainnet, sepolia } from "wagmi/chains";
import { injected, metaMask, walletConnect } from "wagmi/connectors";

const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";

// Curated connector list: MetaMask, OKX (via injected), WalletConnect.
// Other defaults (Coinbase Wallet, Aave / Family social login, etc.) are
// intentionally excluded to keep the modal short and avoid the buggy
// "Continue with Aave" OTP popup flow.
const connectors = [
  metaMask(),
  injected({ target: "okxWallet", shimDisconnect: true }),
  walletConnect({ projectId: walletConnectProjectId, showQrModal: false }),
];

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
    walletConnectProjectId,
    appName: "Lombard AI Assistant",
    enableAaveAccount: false,
    connectors,
    // Use sessionStorage instead of localStorage so wallet state
    // doesn't persist across tabs/sessions, avoiding stale connections
    storage: createStorage({ storage: sessionStorage }),
  }),
);
