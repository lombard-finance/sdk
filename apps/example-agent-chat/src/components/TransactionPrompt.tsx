import { useState } from "react";
import { useAccount, useSendTransaction } from "wagmi";

interface TransactionPromptProps {
  type: string;
  description: string;
  params: Record<string, unknown>;
}

export function TransactionPrompt({ type, description, params }: TransactionPromptProps) {
  const { isConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const [status, setStatus] = useState<"idle" | "pending" | "sent" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const typeLabels: Record<string, string> = {
    stake: "Stake",
    unstake: "Unstake",
    deploy_to_vault: "Deploy to Vault",
  };

  const handleSign = async () => {
    setStatus("pending");
    setErrorMsg(null);
    try {
      // For this demo, we send a zero-value tx to show the wallet signing flow.
      // Production: build the real calldata using the Lombard SDK functions
      // (depositToken, unstakeLBTC, redeemToken, vault deposit) and pass it here.
      const hash = await sendTransactionAsync({
        to: "0x0000000000000000000000000000000000000000",
        value: BigInt(0),
        data: "0x",
      });
      setTxHash(hash);
      setStatus("sent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction rejected";
      // User rejected in wallet
      if (msg.includes("User rejected") || msg.includes("denied")) {
        setStatus("idle");
      } else {
        setErrorMsg(msg.length > 100 ? msg.slice(0, 100) + "..." : msg);
        setStatus("error");
      }
    }
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

      {status === "sent" && txHash ? (
        <div className="w-full rounded-[60px] border border-[var(--color-success)] py-2 text-xs font-medium text-[var(--color-success)] text-center">
          Sent: {txHash.slice(0, 10)}...{txHash.slice(-8)}
        </div>
      ) : status === "error" ? (
        <div className="space-y-2">
          <div className="text-xs text-[var(--color-error)] text-center">{errorMsg}</div>
          <button
            onClick={handleSign}
            className="w-full rounded-[60px] bg-[var(--color-primary)] py-2 text-xs font-semibold text-[var(--color-black)] hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <button
          disabled={!isConnected || status === "pending"}
          onClick={handleSign}
          className="w-full rounded-[60px] bg-[var(--color-primary)] py-2 text-xs font-semibold text-[var(--color-black)] disabled:opacity-40 hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          {!isConnected
            ? "Connect Wallet First"
            : status === "pending"
              ? "Confirm in wallet..."
              : "Sign Transaction"}
        </button>
      )}
    </div>
  );
}
