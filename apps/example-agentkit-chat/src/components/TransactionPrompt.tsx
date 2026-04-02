import { useAccount } from "wagmi";

interface TransactionPromptProps {
  type: string;
  description: string;
  params: Record<string, unknown>;
}

export function TransactionPrompt({ type, description, params }: TransactionPromptProps) {
  const { isConnected } = useAccount();

  const typeLabels: Record<string, string> = {
    stake: "Stake",
    unstake: "Unstake",
    deploy_to_vault: "Deploy to Vault",
  };

  return (
    <div className="mt-3 rounded-lg border border-[var(--color-lombard-border)] bg-[var(--color-lombard-dark)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center rounded-md bg-[var(--color-lombard-orange)]/20 px-2 py-0.5 text-xs font-medium text-[var(--color-lombard-orange)]">
          {typeLabels[type] || type}
        </span>
      </div>
      <p className="text-xs text-[var(--color-lombard-muted)] mb-3">{description}</p>

      {/* Params summary */}
      <div className="space-y-1 mb-3">
        {Object.entries(params)
          .filter(([k]) => !["chainId"].includes(k))
          .map(([key, value]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-[var(--color-lombard-muted)] capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </span>
              <span className="text-[var(--color-lombard-text)] font-mono">
                {String(value)}
              </span>
            </div>
          ))}
      </div>

      <button
        disabled={!isConnected}
        onClick={() => {
          // In a production app, this would call the appropriate SDK function
          // via wagmi's useSendTransaction / useWriteContract hooks
          alert(
            `Transaction signing would happen here.\n\n` +
            `Type: ${type}\n` +
            `Params: ${JSON.stringify(params, null, 2)}\n\n` +
            `In production, this calls the Lombard SDK with your connected wallet.`
          );
        }}
        className="w-full rounded-lg bg-[var(--color-lombard-orange)] py-2 text-xs font-semibold text-black disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {isConnected ? "Sign Transaction" : "Connect Wallet First"}
      </button>
    </div>
  );
}
