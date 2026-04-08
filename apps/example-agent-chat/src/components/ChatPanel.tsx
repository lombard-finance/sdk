import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAccount } from "wagmi";

import logoCircle from "../assets/logo-green-circle.svg";
import { TransactionPrompt } from "./TransactionPrompt";

interface TxResult {
  action: string;
  method: string;
  description: string;
  params: Record<string, unknown>;
}

interface WalletEvent {
  type: "wallet_change";
  id: string;
  address: string | null;
  chainName?: string;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ChatPanel({ open, onClose }: ChatPanelProps) {
  const { address, chain } = useAccount();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevAddressRef = useRef<string | undefined>(undefined);
  const [walletEvents, setWalletEvents] = useState<WalletEvent[]>([]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, append, setMessages } =
    useChat({
      api: "/api/chat",
      body: {
        walletContext: address
          ? { address, chainId: chain?.id, chainName: chain?.name }
          : null,
      },
    });

  // Track wallet changes and insert a visual divider
  useEffect(() => {
    if (prevAddressRef.current === undefined) {
      // First render, just record the address
      prevAddressRef.current = address;
      return;
    }
    if (address !== prevAddressRef.current) {
      prevAddressRef.current = address;
      // Clear chat history when wallet changes since context is different
      setMessages([]);
      setWalletEvents((prev) => [
        ...prev,
        {
          type: "wallet_change",
          id: `wallet-${Date.now()}`,
          address: address ?? null,
          chainName: chain?.name,
        },
      ]);
    }
  }, [address, chain?.name, setMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, walletEvents]);

  if (!open) return null;

  const suggestions = address
    ? ["My balance", "Deposit address", "Deposit status", "Yield strategies", "Exchange rate"]
    : ["What is LBTC?", "Exchange rate", "Yield strategies", "How does staking work?"];

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-black)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <img src={logoCircle} alt="" className="h-7 w-7" />
          <span className="font-semibold text-sm text-white">Lombard Assistant</span>
        </div>
        <button
          onClick={onClose}
          className="text-[var(--color-text-muted)] hover:text-white transition-colors rounded-full p-1"
          aria-label="Close chat"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Quick actions — always visible */}
      <div className="flex flex-wrap gap-2 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => append({ role: "user", content: s })}
            disabled={isLoading}
            className="rounded-[60px] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-teal)] hover:text-[var(--color-teal)] disabled:opacity-40 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[var(--color-bg)]">
        {/* Wallet change notifications */}
        {walletEvents.map((evt) => (
          <div key={evt.id} className="flex items-center gap-2 py-1">
            <div className="flex-1 border-t border-[var(--color-border)]" />
            <span className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">
              {evt.address
                ? `Switched to ${evt.address.slice(0, 6)}...${evt.address.slice(-4)}${evt.chainName ? ` on ${evt.chainName}` : ""}`
                : "Wallet disconnected"}
            </span>
            <div className="flex-1 border-t border-[var(--color-border)]" />
          </div>
        ))}

        {messages.length === 0 && (
          <p className="text-center text-sm text-[var(--color-text-muted)] pt-8">
            {address
              ? "Ask me about your balances, staking, or DeFi positions."
              : "Connect your wallet for personalized help, or ask general questions."}
          </p>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg as unknown as Record<string, unknown>}
            onTxError={(err) => append({ role: "user", content: `Transaction failed with error: "${err}". What should I do?` })}
            onTxSuccess={(msg) => append({ role: "user", content: msg })}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            Thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder={address ? "Ask about your balances, staking..." : "Ask about Lombard..."}
            className="flex-1 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-teal)] transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-[60px] bg-[var(--color-primary)] p-2.5 text-[var(--color-black)] disabled:opacity-40 hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MessageBubble({ message, onTxError, onTxSuccess }: { message: Record<string, any>; onTxError?: (error: string) => void; onTxSuccess?: (msg: string) => void }) {
  const isUser = message.role === "user";

  const txActions: TxResult[] = [];
  const parts = (message.parts || []) as Array<Record<string, unknown>>;
  for (const part of parts) {
    if (part.type === "tool-invocation") {
      const inv = part.toolInvocation as Record<string, unknown> | undefined;
      if (inv?.state === "result") {
        const r = inv.result as Record<string, unknown> | undefined;
        if (r?.action === "sdk_execute" && r.method && r.description && r.params) {
          txActions.push(r as unknown as TxResult);
        }
      }
    }
  }
  // Fallback: also check legacy toolInvocations array
  if (txActions.length === 0) {
    for (const inv of (message.toolInvocations || []) as Array<Record<string, unknown>>) {
      const r = inv.result as Record<string, unknown> | undefined;
      if (r?.action === "sdk_execute" && r.method && r.description && r.params) {
        txActions.push(r as unknown as TxResult);
      }
    }
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-[var(--color-chat-user-bg)] text-[var(--color-chat-user-text)]"
            : "bg-[var(--color-chat-assistant-bg)] text-[var(--color-chat-assistant-text)]"
        }`}
      >
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
            li: ({ children }) => <li className="mb-0.5">{children}</li>,
            table: ({ children }) => (
              <div className="overflow-x-auto my-2">
                <table className="w-full text-xs border-collapse">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="border-b border-[var(--color-border-strong)]">{children}</thead>,
            th: ({ children }) => <th className="text-left px-2 py-1 font-semibold">{children}</th>,
            td: ({ children }) => <td className="px-2 py-1 border-t border-[var(--color-border)]">{children}</td>,
            code: ({ children }) => (
              <code className="bg-[var(--color-border)] rounded px-1 py-0.5 text-xs font-mono">{children}</code>
            ),
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--color-teal)] underline">
                {children}
              </a>
            ),
          }}
        >
          {message.content as string}
        </Markdown>

        {txActions.map((tx, i) => (
          <TransactionPrompt
            key={i}
            method={tx.method}
            description={tx.description}
            params={tx.params}
            onError={onTxError}
            onSuccess={onTxSuccess}
          />
        ))}
      </div>
    </div>
  );
}
