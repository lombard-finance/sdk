import { useAccount, useConnect, useDisconnect } from "wagmi";

export function WalletBar() {
  const { address, chain, isConnected, connector } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--color-teal-light)]">
          {chain?.name}
        </span>
        <span className="rounded-[60px] bg-white/10 border border-white/10 px-3 py-1.5 text-sm font-mono text-white">
          {short}
        </span>
        <button
          onClick={() => {
            disconnect({ connector });
          }}
          className="rounded-[60px] border border-white/20 px-3 py-1 text-xs text-white/80 hover:text-white hover:border-white/40 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        const c = connectors[0];
        if (c) connect({ connector: c });
      }}
      className="rounded-[60px] bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-[var(--color-black)] hover:bg-[var(--color-primary-dark)] transition-colors"
    >
      Connect Wallet
    </button>
  );
}
