import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";

import logoCircle from "../assets/logo-green-circle.svg";
import { TransactionPrompt } from "./TransactionPrompt";

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ChatPanel({ open, onClose }: ChatPanelProps) {
  const { address, chain } = useAccount();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } =
    useChat({
      api: "/api/chat",
      body: {
        walletContext: address
          ? { address, chainId: chain?.id, chainName: chain?.name }
          : null,
      },
    });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!open) return null;

  const suggestions = address
    ? ["What's my LBTC balance?", "Show the minting rate", "Check my deposits"]
    : ["What is LBTC?", "Show the minting rate", "How does staking work?"];

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

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[var(--color-bg)]">
        {messages.length === 0 && (
          <div className="space-y-4 pt-8">
            <p className="text-center text-sm text-[var(--color-text-muted)]">
              {address
                ? "Ask me about your balances, staking, or DeFi positions."
                : "Connect your wallet for personalized help, or ask general questions."}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="rounded-[60px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3.5 py-1.5 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-teal)] hover:text-[var(--color-teal)] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
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
            disabled={isLoading}
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

function MessageBubble({ message }: { message: { role: string; content: string; toolInvocations?: unknown[] } }) {
  const isUser = message.role === "user";

  const txActions = (message.toolInvocations || [])
    .filter((t: unknown) => {
      const inv = t as { result?: { action?: string } };
      return inv.result?.action === "sign_transaction";
    })
    .map((t: unknown) => (t as { result: { type: string; description: string; params: Record<string, unknown> } }).result);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-[var(--color-chat-user-bg)] text-[var(--color-chat-user-text)]"
            : "bg-[var(--color-chat-assistant-bg)] text-[var(--color-chat-assistant-text)]"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>

        {txActions.map((tx, i) => (
          <TransactionPrompt
            key={i}
            type={tx.type}
            description={tx.description}
            params={tx.params}
          />
        ))}
      </div>
    </div>
  );
}
