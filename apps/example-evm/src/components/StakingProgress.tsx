import { useCallback, useState } from "react";

import { getStatusColor } from "../lib/status-colors";
import type { StakingProgressInfo, StakingStatus } from "../lib/types";

interface StakingProgressProps {
  depositAddress: string | null;
  amount: string | null;
  status: StakingStatus;
  progress: StakingProgressInfo;
  onReset: () => void;
  targetChain?: string;
}

function CopyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.667 4.667V4c0-.934 0-1.4.181-1.757a1.667 1.667 0 0 1 .729-.728C5.933 1.333 6.4 1.333 7.333 1.333H12c.934 0 1.4 0 1.757.182.313.16.569.415.728.728.182.357.182.823.182 1.757v4.667c0 .933 0 1.4-.182 1.756-.16.314-.415.569-.728.729-.357.181-.823.181-1.757.181h-.667M11.333 7.333V12c0 .933 0 1.4-.181 1.757a1.667 1.667 0 0 1-.729.728c-.356.182-.823.182-1.756.182H4c-.933 0-1.4 0-1.757-.182a1.667 1.667 0 0 1-.728-.728C1.333 13.4 1.333 12.933 1.333 12V7.333c0-.933 0-1.4.182-1.756.16-.314.415-.569.728-.729.357-.181.824-.181 1.757-.181h4.667c.933 0 1.4 0 1.756.181.314.16.569.415.729.729.181.356.181.823.181 1.756Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.333 4 6 11.333 2.667 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Display staking progress and status
 */
export function StakingProgress({
  depositAddress,
  amount,
  status,
  progress,
  onReset,
  targetChain,
}: StakingProgressProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!depositAddress) return;
    try {
      await navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [depositAddress]);

  const isComplete = status.phase === "complete";
  const hasError = status.phase === "error";
  const isWaitingDeposit = status.phase === "waiting-deposit";
  const isActivelyLoading = ["preparing", "confirming", "minting"].includes(
    status.phase,
  );

  const getTitle = () => {
    if (isWaitingDeposit) return "Send BTC to the address below";
    if (isComplete) return "Staking Complete";
    if (hasError) return "Staking Error";
    return "Staking Progress";
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-semibold mb-6">{getTitle()}</h2>

      {/* Status */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {isActivelyLoading && <span className="spinner" />}
          <span
            className={`text-lg font-medium ${getStatusColor(status.phase)}`}
          >
            {status.message}
          </span>
        </div>

        {/* Progress details */}
        {progress.confirmations !== undefined && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Confirmations</span>
              <span className="font-medium">
                {progress.confirmations} / {progress.requiredConfirmations || 6}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-capital-green h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    ((progress.confirmations || 0) /
                      (progress.requiredConfirmations || 6)) *
                      100,
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Destination Chain */}
      {targetChain && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm">
            <strong>Destination Chain:</strong> {targetChain}
          </p>
        </div>
      )}

      {/* Deposit Address */}
      {depositAddress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Amount to Send:</span>
            <span className="text-lg font-bold text-primary">{amount} BTC</span>
          </div>

          <label className="block text-sm font-medium mb-2">
            Bitcoin Deposit Address
          </label>
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <code className="flex-1 text-sm break-all font-mono">
              {depositAddress}
            </code>
            <button
              type="button"
              onClick={() => {
                void handleCopy();
              }}
              title={copied ? "Copied!" : "Copy address"}
              className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                copied
                  ? "text-sentiment-positive bg-green-50"
                  : "text-grey-stone hover:bg-gray-200"
              }`}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {isComplete || hasError ? (
        <button onClick={onReset} className="btn btn-secondary w-full">
          Start New Stake
        </button>
      ) : (
        <button
          onClick={onReset}
          className="btn btn-secondary w-full mt-4 text-sm"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
