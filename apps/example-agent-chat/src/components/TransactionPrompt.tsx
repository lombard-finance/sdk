import { ChainId } from "@lombard.finance/sdk";
import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";

import { getPartnerId } from "../lib/partnerId";

interface TransactionPromptProps {
  method: string;
  description: string;
  params: Record<string, unknown>;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

const METHOD_LABELS = {
  "evm.stake": "Stake",
  "evm.unstake": "Unstake",
  "evm.deploy": "Deploy to Vault",
  "evm.claimDeposit": "Claim Deposit",
  "evm.withdrawFromVault": "Withdraw from Vault",
  "evm.cancelWithdrawal": "Cancel Vault Withdrawal",
  "btc.generateDepositAddress": "Generate BTC Deposit Address (LBTC)",
  "btc.generateBtcbDepositAddress": "Generate BTC Deposit Address (BTC.b)",
  "morpho.supplyCollateral": "Supply Collateral to Morpho",
  "morpho.borrow": "Borrow from Morpho",
  "morpho.repay": "Repay on Morpho",
} as const satisfies Record<string, string>;

type MethodName = keyof typeof METHOD_LABELS;

/** Chain IDs that map to Env.testnet in the SDK. */
const TESTNET_CHAIN_IDS = new Set<number>([
  ChainId.sepolia,
  ChainId.baseSepoliaTestnet,
]);

function getEnvForChainId(chainId: number): "prod" | "testnet" {
  return TESTNET_CHAIN_IDS.has(chainId) ? "testnet" : "prod";
}

export function TransactionPrompt({
  method,
  description,
  params,
  onError,
  onSuccess,
}: TransactionPromptProps) {
  const { address, chain, connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [status, setStatus] = useState<
    "idle" | "executing" | "success" | "error"
  >("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [btcDepositAddress, setBtcDepositAddress] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const label = METHOD_LABELS[method as MethodName] ?? method;

  const handleExecute = async () => {
    if (!address) return;
    setStatus("executing");
    setError(null);

    try {
      // Get the EIP1193 provider from the connected wallet's connector,
      // NOT window.ethereum (which may be a different wallet extension)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = (await connector?.getProvider()) as any;
      if (!provider)
        throw new Error(
          "No wallet provider found. Please reconnect your wallet.",
        );

      const sdkChainId = params.chainId as ChainId;
      const env = getEnvForChainId(sdkChainId);

      // Switch wallet to the correct chain if needed
      if (chain && chain.id !== sdkChainId) {
        await switchChainAsync({ chainId: sdkChainId });
      }

      if (method === "btc.generateDepositAddress") {
        const {
          createLombardSDK,
          Env,
          AssetId,
          evmChainIdToChain,
          BtcActionStatus,
          MIN_STAKE_AMOUNT_BTC,
        } = await import("@lombard.finance/sdk");

        const destChain = evmChainIdToChain(sdkChainId);
        // Partner ID comes from getPartnerId, which respects the
        // header selector (localStorage override) and falls back to the
        // env var / default. Testnet and mainnet have separate BFF
        // partner registries — sending a mainnet partner like "okx" to
        // Sepolia returns "partner not found".
        const partnerId = getPartnerId(env === "testnet" ? "testnet" : "mainnet");

        const sdk = await createLombardSDK({
          env: env === "testnet" ? Env.testnet : Env.prod,
          providers: {
            evm: () => provider,
          },
          ...(partnerId ? { partner: { partnerId } } : {}),
        });

        const stake = sdk.chain.btc.stake({
          assetOut: AssetId.LBTC,
          destChain,
        });

        await stake.prepare({
          amount: String(MIN_STAKE_AMOUNT_BTC),
          recipient: address,
        });

        // If already ADDRESS_READY (existing deposit), return it directly
        if (
          stake.status === BtcActionStatus.ADDRESS_READY &&
          stake.depositAddress
        ) {
          setBtcDepositAddress(stake.depositAddress);
          setStatus("success");
          onSuccess?.(
            `Your existing BTC deposit address is ${stake.depositAddress}. You can send BTC to this address to receive LBTC.`,
          );
          return;
        }

        // Authorize if needed (handles fee auth or address confirmation)
        if (
          stake.status === BtcActionStatus.NEEDS_FEE_AUTHORIZATION ||
          stake.status === BtcActionStatus.NEEDS_ADDRESS_CONFIRMATION
        ) {
          await stake.authorize();
        }

        // Generate the deposit address (status must be READY at this point)
        if (stake.status === BtcActionStatus.READY) {
          const btcAddr = await stake.generateDepositAddress();
          setBtcDepositAddress(btcAddr);
          setStatus("success");
          onSuccess?.(
            `BTC deposit address generated: ${btcAddr}. Send BTC to this address to receive LBTC on ${chain?.name || "Ethereum"}. What is the minimum stake amount and current exchange rate?`,
          );
          return;
        }

        // If we got here, check if the address was set during prepare/authorize
        if (stake.depositAddress) {
          setBtcDepositAddress(stake.depositAddress);
          setStatus("success");
          onSuccess?.(
            `BTC deposit address: ${stake.depositAddress}. Send BTC to this address to receive LBTC.`,
          );
          return;
        }

        throw new Error(`Unexpected state: ${stake.status}. Please try again.`);
      }

      if (method === "btc.generateBtcbDepositAddress") {
        const {
          createLombardSDK,
          Env,
          AssetId,
          evmChainIdToChain,
          BtcActionStatus,
          MIN_STAKE_AMOUNT_BTC,
        } = await import("@lombard.finance/sdk");

        const destChain = evmChainIdToChain(sdkChainId);
        const partnerId = getPartnerId(env === "testnet" ? "testnet" : "mainnet");

        const sdk = await createLombardSDK({
          env: env === "testnet" ? Env.testnet : Env.prod,
          providers: {
            evm: () => provider,
          },
          ...(partnerId ? { partner: { partnerId } } : {}),
        });

        // sdk.chain.btc.deposit produces BTC.b (vs. .stake which produces LBTC)
        const deposit = sdk.chain.btc.deposit({
          assetOut: AssetId.BTCb,
          destChain,
        });

        await deposit.prepare({
          amount: String(MIN_STAKE_AMOUNT_BTC),
          recipient: address,
        });

        if (
          deposit.status === BtcActionStatus.ADDRESS_READY &&
          deposit.depositAddress
        ) {
          setBtcDepositAddress(deposit.depositAddress);
          setStatus("success");
          onSuccess?.(
            `Your existing BTC -> BTC.b deposit address is ${deposit.depositAddress}. Send BTC to this address to receive BTC.b on ${chain?.name || "Ethereum"}.`,
          );
          return;
        }

        if (
          deposit.status === BtcActionStatus.NEEDS_FEE_AUTHORIZATION ||
          deposit.status === BtcActionStatus.NEEDS_ADDRESS_CONFIRMATION
        ) {
          await deposit.authorizeFee();
        }

        if (deposit.status === BtcActionStatus.READY) {
          const btcAddr = await deposit.generateDepositAddress();
          setBtcDepositAddress(btcAddr);
          setStatus("success");
          onSuccess?.(
            `BTC -> BTC.b deposit address generated: ${btcAddr}. Send BTC to this address to receive BTC.b on ${chain?.name || "Ethereum"}.`,
          );
          return;
        }

        if (deposit.depositAddress) {
          setBtcDepositAddress(deposit.depositAddress);
          setStatus("success");
          onSuccess?.(
            `BTC -> BTC.b deposit address: ${deposit.depositAddress}. Send BTC to this address to receive BTC.b.`,
          );
          return;
        }

        throw new Error(
          `Unexpected state: ${deposit.status}. Please try again.`,
        );
      }

      let hash: string;

      switch (method as MethodName) {
        case "evm.deploy": {
          const { depositEarn, Token } = await import("@lombard.finance/sdk");
          hash = await depositEarn({
            amount: params.amount as string,
            approve: true,
            token: Token.LBTC,
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
        case "evm.claimDeposit": {
          const { claimLBTC } = await import("@lombard.finance/sdk");
          hash = await claimLBTC({
            data: params.rawPayload as string,
            proofSignature: params.proofSignature as string,
            account: address,
            chainId: sdkChainId,
            provider,
            env,
          });
          break;
        }
        case "evm.withdrawFromVault": {
          const { withdrawEarn } = await import("@lombard.finance/sdk");
          const result = await withdrawEarn({
            amount: params.amount as string,
            account: address,
            chainId: sdkChainId,
            provider,
            env,
          });
          hash = result.queueTxHash;
          break;
        }
        case "evm.cancelWithdrawal": {
          const { cancelEarnWithdrawal } = await import(
            "@lombard.finance/sdk"
          );
          hash = await cancelEarnWithdrawal({
            account: address,
            chainId: sdkChainId,
            provider,
            env,
          });
          break;
        }
        case "morpho.repay":
        case "morpho.borrow":
        case "morpho.supplyCollateral": {
          const txs =
            (params.transactions as {
              to: string;
              data: string;
              label: string;
            }[]) || [];
          if (txs.length === 0) throw new Error("No transactions to execute");
          const { makePublicClient } = await import("@lombard.finance/sdk");
          const publicClient = makePublicClient({ chainId: sdkChainId, env });
          // Send each transaction sequentially (approve, then supply)
          for (let i = 0; i < txs.length; i++) {
            const tx = txs[i];
            hash = await provider.request({
              method: "eth_sendTransaction",
              params: [
                {
                  from: address,
                  to: tx.to,
                  data: tx.data,
                },
              ],
            });
            // Wait for confirmation before sending the next one
            if (i < txs.length - 1) {
              await publicClient.waitForTransactionReceipt({
                hash: hash as `0x${string}`,
              });
            }
          }
          break;
        }
        default:
          throw new Error(`Unknown method: ${method}`);
      }

      setTxHash(hash);
      setStatus("success");
      onSuccess?.(
        `Transaction submitted successfully with hash ${hash}. What should I do next?`,
      );
    } catch (err) {
      // Detect user rejection (EIP-1193 code 4001 or common rejection patterns)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errObj = err as any;
      const code = errObj?.code ?? errObj?.cause?.code;
      const raw = err instanceof Error ? err.message : String(err);
      const isRejection =
        code === 4001 ||
        code === "ACTION_REJECTED" ||
        /user (rejected|denied|cancelled)/i.test(raw) ||
        /request.*reject/i.test(raw);

      if (isRejection) {
        setError(
          "Transaction rejected. Click Execute to try again when ready.",
        );
        setStatus("error");
        // Don't notify the AI about user rejections
        return;
      }

      // Sanitize other errors: show first line only, strip internal details
      const firstLine = raw
        .split("\n")[0]
        .replace(/https?:\/\/[^\s]+/g, "")
        .trim();
      const clean =
        firstLine.length > 200 ? firstLine.slice(0, 200) + "..." : firstLine;
      const errorMsg = clean || "Transaction failed";
      setError(errorMsg);
      setStatus("error");
      onError?.(errorMsg);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center rounded-[60px] bg-[var(--color-teal)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--color-teal)]">
          {label}
        </span>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mb-3">
        {description}
      </p>

      <div className="space-y-1 mb-3">
        {(method === "morpho.supplyCollateral" || method === "morpho.borrow" || method === "morpho.repay") &&
        Array.isArray(params.transactions)
          ? (params.transactions as { to: string; label: string }[]).map(
              (tx, i) => (
                <div key={i} className="flex justify-between text-xs gap-2">
                  <span className="text-[var(--color-text-muted)] shrink-0">
                    Step {i + 1}
                  </span>
                  <span className="text-[var(--color-text)] truncate text-right">
                    {tx.label}
                  </span>
                </div>
              ),
            )
          : Object.entries(params)
              .filter(([k]) => !["chainId"].includes(k))
              .map(([key, value]) => {
                const str = String(value);
                const isAddress = str.startsWith("0x") && str.length > 20;
                const display = isAddress
                  ? `${str.slice(0, 6)}...${str.slice(-4)}`
                  : str;
                return (
                  <div key={key} className="flex justify-between text-xs gap-2">
                    <span className="text-[var(--color-text-muted)] capitalize shrink-0">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span
                      className="text-[var(--color-text)] font-mono truncate text-right"
                      title={isAddress ? str : undefined}
                    >
                      {display}
                    </span>
                  </div>
                );
              })}
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

      {status === "success" && btcDepositAddress && (
        <div className="w-full rounded-lg border border-green-500/30 bg-green-500/10 py-3 px-3 text-xs text-green-400 text-center space-y-1">
          <div className="font-medium">BTC Deposit Address Generated</div>
          <div className="font-mono text-green-300 break-all select-all">
            {btcDepositAddress}
          </div>
          <div className="text-green-500/70 text-[10px]">
            Send BTC to this address to receive LBTC
          </div>
        </div>
      )}

      {status === "success" && txHash && (
        <div className="w-full rounded-[60px] border border-green-500 py-2 text-xs font-medium text-green-500 text-center">
          Transaction submitted:{" "}
          <span className="font-mono">
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </span>
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
