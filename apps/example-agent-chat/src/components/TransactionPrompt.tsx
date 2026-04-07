import type { ChainId } from "@lombard.finance/sdk";
import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";

interface TransactionPromptProps {
  method: string;
  description: string;
  params: Record<string, unknown>;
}

const METHOD_LABELS: Record<string, string> = {
  "evm.stake": "Stake",
  "evm.unstake": "Unstake",
  "evm.deploy": "Deploy to Vault",
};

/** Chain IDs that map to Env.testnet in the SDK. */
const TESTNET_CHAIN_IDS = new Set([
  11155111, // sepolia
  84532, // baseSepoliaTestnet
  43113, // avalancheFuji
  80084, // berachainBartioTestnet
  97, // binanceSmartChainTestnet
  17000, // holesky
  2810, // morphHolesky
  57054, // sonicBlazeTestnet
]);

function getEnvForChainId(chainId: number): "prod" | "testnet" {
  return TESTNET_CHAIN_IDS.has(chainId) ? "testnet" : "prod";
}

export function TransactionPrompt({ method, description, params }: TransactionPromptProps) {
  const { address, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [status, setStatus] = useState<"idle" | "executing" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const label = METHOD_LABELS[method] || method;

  const handleExecute = async () => {
    if (!address) return;
    setStatus("executing");
    setError(null);

    try {
      const provider = window.ethereum;
      if (!provider) throw new Error("No wallet provider found");

      const sdkChainId = params.chainId as ChainId;
      const env = getEnvForChainId(sdkChainId);

      // Switch wallet to the correct chain if needed
      if (chain && chain.id !== sdkChainId) {
        await switchChainAsync({ chainId: sdkChainId });
      }

      let hash: string;

      switch (method) {
        case "evm.deploy": {
          const { deposit, Token, Vault } = await import("@lombard.finance/sdk");
          hash = await deposit({
            amount: params.amount as string,
            approve: true,
            token: Token.LBTC,
            vaultKey: Vault.Veda,
            account: address,
            chainId: sdkChainId,
            provider,
            env,
          });
          break;
        }
        case "evm.stake": {
          const { depositToken, Token } = await import("@lombard.finance/sdk");
          hash = await depositToken({
            amount: params.amount as string,
            tokenIn: Token.BTCb,
            tokenOut: Token.LBTC,
            account: address,
            chainId: sdkChainId,
            provider,
            env,
          });
          break;
        }
        case "evm.unstake": {
          if (params.outputAsset === "BTC") {
            const { unstakeLBTC, Token } = await import("@lombard.finance/sdk");
            hash = await unstakeLBTC({
              amount: params.amount as string,
              btcAddress: params.recipient as string,
              tokenIn: Token.LBTC,
              account: address,
              chainId: sdkChainId,
              provider,
              env,
            });
          } else {
            const { redeemToken, Token } = await import("@lombard.finance/sdk");
            hash = await redeemToken({
              amount: params.amount as string,
              tokenIn: Token.LBTC,
              tokenOut: Token.BTCb,
              account: address,
              chainId: sdkChainId,
              provider,
              env,
            });
          }
          break;
        }
        default:
          throw new Error(`Unknown method: ${method}`);
      }

      setTxHash(hash);
      setStatus("success");
    } catch (err) {
      // Sanitize error: show first line only, strip internal details
      const raw = err instanceof Error ? err.message : "Transaction failed";
      const firstLine = raw.split("\n")[0].replace(/https?:\/\/[^\s]+/g, "").trim();
      const clean = firstLine.length > 200 ? firstLine.slice(0, 200) + "..." : firstLine;
      setError(clean || "Transaction failed");
      setStatus("error");
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center rounded-[60px] bg-[var(--color-teal)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--color-teal)]">
          {label}
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

      {status === "idle" && (
        <button
          onClick={handleExecute}
          disabled={!address}
          className="w-full rounded-[60px] bg-[var(--color-primary)] py-2 text-xs font-semibold text-[var(--color-black)] hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-40"
        >
          {address ? "Execute Transaction" : "Connect Wallet to Execute"}
        </button>
      )}

      {status === "executing" && (
        <div className="w-full rounded-[60px] border border-[var(--color-teal)] py-2 text-xs font-medium text-[var(--color-teal)] text-center flex items-center justify-center gap-2">
          <span className="h-3 w-3 rounded-full border-2 border-[var(--color-teal)] border-t-transparent animate-spin" />
          Awaiting wallet confirmation...
        </div>
      )}

      {status === "success" && txHash && (
        <div className="w-full rounded-[60px] border border-green-500 py-2 text-xs font-medium text-green-500 text-center">
          Transaction submitted:{" "}
          <span className="font-mono">{txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-2">
          <div className="w-full rounded-lg border border-red-500/30 bg-red-500/10 py-2 px-3 text-xs text-red-400">
            {error}
          </div>
          <button
            onClick={handleExecute}
            className="w-full rounded-[60px] bg-[var(--color-primary)] py-2 text-xs font-semibold text-[var(--color-black)] hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
