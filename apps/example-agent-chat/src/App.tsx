import { useState } from "react";

import logoWhite from "./assets/logo-white.svg";
import { ChatPanel } from "./components/ChatPanel";
import { WalletBar } from "./components/WalletBar";

export function App() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-black)] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <img src={logoWhite} alt="Lombard" className="h-6" />
          <WalletBar />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-semibold text-[var(--color-text)] mb-3">
            AI-Powered Bitcoin Staking
          </h2>
          <p className="text-[var(--color-text-muted)] text-lg mb-10 max-w-xl mx-auto">
            Chat with the Lombard assistant to stake BTC, check balances, and manage DeFi positions.
          </p>
          <button
            onClick={() => setChatOpen(true)}
            className="rounded-[60px] bg-[var(--color-primary)] px-8 py-3 text-[var(--color-black)] font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Open Assistant
          </button>
        </div>

        {/* Feature cards */}
        <div className="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Deposit BTC"
            description="Get your BTC deposit address to stake native Bitcoin and receive LBTC."
            example={`"Get my BTC deposit address"`}
          />
          <FeatureCard
            title="Stake BTC.b"
            description="Convert BTC.b (wrapped Bitcoin) to LBTC for staking yield."
            example={`"Stake 0.1 BTC.b to LBTC"`}
          />
          <FeatureCard
            title="Check Balances"
            description="View your LBTC and BTC.b balances on any supported chain."
            example={`"What's my balance?"`}
          />
          <FeatureCard
            title="Track Deposits"
            description="Monitor deposit status, confirmations, and claim when ready."
            example={`"Check my deposit status"`}
          />
          <FeatureCard
            title="Yield Strategies"
            description="Browse DeFi vaults with APY and TVL, then deploy LBTC for extra yield."
            example={`"Show available strategies"`}
          />
          <FeatureCard
            title="Unstake & Redeem"
            description="Unstake LBTC to BTC (cross-chain) or redeem to BTC.b (same chain)."
            example={`"Unstake 0.05 LBTC to BTC.b"`}
          />
        </div>
      </main>

      {/* Chat panel */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* FAB to open chat */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[var(--color-primary)] text-[var(--color-black)] shadow-lg hover:bg-[var(--color-primary-dark)] transition-colors flex items-center justify-center"
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
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 hover:border-[var(--color-border-strong)] transition-colors">
      <h3 className="font-semibold text-[var(--color-text)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">{description}</p>
      <code className="text-xs text-[var(--color-teal)]">{example}</code>
    </div>
  );
}
