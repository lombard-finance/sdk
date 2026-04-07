import { useState } from "react";

interface TransactionPromptProps {
  type: string;
  description: string;
  params: Record<string, unknown>;
}

export function TransactionPrompt({ type, description, params }: TransactionPromptProps) {
  const [previewed, setPreviewed] = useState(false);

  const typeLabels: Record<string, string> = {
    stake: "Stake",
    unstake: "Unstake",
    deploy_to_vault: "Deploy to Vault",
  };

  return (
    <div className="mt-3 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center rounded-[60px] bg-[var(--color-teal)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--color-teal)]">
          {typeLabels[type] || type}
        </span>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mb-3">{description}</p>

      <div className="space-y-1 mb-3">
        {Object.entries(params)
          .filter(([k]) => !["chainId"].includes(k))
          .map(([key, value]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-[var(--color-text-muted)] capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </span>
              <span className="text-[var(--color-text)] font-mono">
                {String(value)}
              </span>
            </div>
          ))}
      </div>

      {previewed ? (
        <div className="w-full rounded-[60px] border border-[var(--color-teal)] py-2 text-xs font-medium text-[var(--color-teal)] text-center">
          In production, this would execute the {typeLabels[type] || type} operation via the Lombard SDK
        </div>
      ) : (
        <button
          onClick={() => setPreviewed(true)}
          className="w-full rounded-[60px] bg-[var(--color-primary)] py-2 text-xs font-semibold text-[var(--color-black)] hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          Preview Transaction (Demo)
        </button>
      )}
    </div>
  );
}
