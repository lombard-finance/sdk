import { useAccount, useConnect, useDisconnect } from "wagmi";

export function WalletBar() {
  const { address, chain, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--color-lombard-muted)]">
          {chain?.name}
        </span>
        <span className="rounded-lg bg-[var(--color-lombard-surface)] border border-[var(--color-lombard-border)] px-3 py-1.5 text-sm font-mono text-[var(--color-lombard-text)]">
          {short}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-sm text-[var(--color-lombard-muted)] hover:text-[var(--color-lombard-text)] transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        const connector = connectors[0];
        if (connector) connect({ connector });
      }}
      className="rounded-lg bg-[var(--color-lombard-surface)] border border-[var(--color-lombard-border)] px-4 py-2 text-sm text-[var(--color-lombard-text)] hover:border-[var(--color-lombard-orange)] transition-colors"
    >
      Connect Wallet
    </button>
  );
}
