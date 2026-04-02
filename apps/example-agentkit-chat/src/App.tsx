import { useState } from "react";

import { ChatPanel } from "./components/ChatPanel";
import { WalletBar } from "./components/WalletBar";

export function App() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-lombard-dark)]">
      {/* Header */}
      <header className="border-b border-[var(--color-lombard-border)] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[var(--color-lombard-orange)] flex items-center justify-center text-black font-bold text-sm">
              L
            </div>
            <h1 className="text-lg font-semibold text-[var(--color-lombard-text)]">
              Lombard SDK
            </h1>
          </div>
          <WalletBar />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-[var(--color-lombard-text)] mb-3">
            AI-Powered Bitcoin Staking
          </h2>
          <p className="text-[var(--color-lombard-muted)] text-lg mb-8">
            Chat with the Lombard assistant to stake BTC, check balances, and manage DeFi positions.
          </p>
          <button
            onClick={() => setChatOpen(true)}
            className="rounded-xl bg-[var(--color-lombard-orange)] px-8 py-3 text-black font-semibold hover:opacity-90 transition-opacity"
          >
            Open Assistant
          </button>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FeatureCard
            title="Check Balances"
            description="Ask about your LBTC and BTC.b balances across chains."
            example={`"What's my LBTC balance?"`}
          />
          <FeatureCard
            title="Stake & Unstake"
            description="Stake BTC.b to receive LBTC, or unstake back."
            example={`"Stake 0.1 BTC.b to LBTC"`}
          />
          <FeatureCard
            title="Deploy to Vaults"
            description="Deploy LBTC into DeFi vaults for additional yield."
            example={`"Deploy 0.5 LBTC to Veda vault"`}
          />
        </div>
      </main>

      {/* Chat panel */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* FAB to open chat */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[var(--color-lombard-orange)] text-black shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center"
          aria-label="Open chat"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
    </div>
  );
}

function FeatureCard({ title, description, example }: {
  title: string;
  description: string;
  example: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-lombard-border)] bg-[var(--color-lombard-surface)] p-6">
      <h3 className="font-semibold text-[var(--color-lombard-text)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-lombard-muted)] mb-3">{description}</p>
      <code className="text-xs text-[var(--color-lombard-orange)]">{example}</code>
    </div>
  );
}
