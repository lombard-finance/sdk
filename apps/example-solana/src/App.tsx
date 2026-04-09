import { Env } from "@lombard.finance/sdk";
import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/layout/Layout";
import { SolanaWalletProvider } from "./contexts/SolanaWalletContext";
import { getEnvironment } from "./lib/config";
import { SolanaStakePage } from "./pages/SolanaStakePage";
import { SolanaUnstakePage } from "./pages/SolanaUnstakePage";

function App() {
  const [env, setEnv] = useState<Env>(() => {
    const stored = localStorage.getItem("lombard-env");
    if (
      stored &&
      Object.values(Env).includes(stored as Env) &&
      stored !== Env.testnet
    ) {
      return stored as Env;
    }
    const defaultEnv = getEnvironment();
    return defaultEnv === Env.testnet ? Env.stage : defaultEnv;
  });

  const handleEnvChange = (newEnv: Env) => {
    if (confirm("Changing environment will reload all examples. Continue?")) {
      setEnv(newEnv);
      localStorage.setItem("lombard-env", newEnv);
    }
  };

  return (
    <SolanaWalletProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<Layout env={env} onEnvChange={handleEnvChange} />}
          >
            <Route index element={<Navigate to="/staking" replace />} />
            <Route path="staking" element={<SolanaStakePage env={env} />} />
            <Route
              path="unstaking"
              element={
                env === Env.stage ? (
                  <Navigate to="/staking" replace />
                ) : (
                  <SolanaUnstakePage env={env} />
                )
              }
            />
            <Route path="*" element={<Navigate to="/staking" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SolanaWalletProvider>
  );
}

export default App;
