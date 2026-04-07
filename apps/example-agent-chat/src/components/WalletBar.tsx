import { ConnectKitButton } from "connectkit";
import { useAccount, useSwitchChain } from "wagmi";
import { mainnet, base, sepolia, baseSepolia } from "wagmi/chains";

const CHAINS = [mainnet, base, sepolia, baseSepolia];

function getEnvLabel(chainId?: number): { label: string; isTestnet: boolean } {
  if (!chainId) return { label: "", isTestnet: false };
  const testnets: number[] = [sepolia.id, baseSepolia.id];
  return testnets.includes(chainId)
    ? { label: "Testnet", isTestnet: true }
    : { label: "Mainnet", isTestnet: false };
}

export function WalletBar() {
  const { chain, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const env = getEnvLabel(chain?.id);

  return (
    <div className="flex items-center gap-3">
      {isConnected && chain && (
        <>
          {/* Environment badge */}
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              env.isTestnet
                ? "bg-amber-500/20 text-amber-400"
                : "bg-emerald-500/20 text-emerald-400"
            }`}
          >
            {env.label}
          </span>

          {/* Network switcher */}
          <select
            value={chain.id}
            onChange={(e) => switchChain({ chainId: Number(e.target.value) })}
            className="bg-white/10 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer hover:bg-white/15 transition-colors"
          >
            {CHAINS.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#1a1a1a] text-white">
                {c.name}
              </option>
            ))}
          </select>
        </>
      )}

      <ConnectKitButton />
    </div>
  );
}
