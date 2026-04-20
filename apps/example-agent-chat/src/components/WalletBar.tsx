import { ConnectKitButton } from "connectkit";
import { useAccount, useSwitchChain } from "wagmi";
import { base, baseSepolia, mainnet, sepolia } from "wagmi/chains";

const CHAINS = [mainnet, base, sepolia, baseSepolia];
const TESTNET_IDS: number[] = [sepolia.id, baseSepolia.id];

export function WalletBar() {
  const { chain, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const isTestnet = chain ? TESTNET_IDS.includes(chain.id) : false;

  return (
    <div className="flex items-center gap-3">
      {isConnected && (
        <>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isTestnet
                ? "bg-amber-500/20 text-amber-400"
                : "bg-emerald-500/20 text-emerald-400"
            }`}
          >
            {isTestnet ? "Testnet" : "Mainnet"}
          </span>

          <select
            value={chain?.id ?? mainnet.id}
            onChange={(e) => switchChain({ chainId: Number(e.target.value) })}
            className="bg-white/10 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer hover:bg-white/15 transition-colors appearance-none"
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
