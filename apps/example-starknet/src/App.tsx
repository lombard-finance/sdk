import { Env } from '@lombard.finance/sdk';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/layout/Layout';
import { StarknetWalletProvider } from './contexts/StarknetWalletContext';
import { getEnvironment } from './lib/config';
import { StarknetStakePage } from './pages/StarknetStakePage';
import { StarknetUnstakePage } from './pages/StarknetUnstakePage';

function App() {
  const [env, setEnv] = useState<Env>(() => {
    const stored = localStorage.getItem('lombard-env');
    if (stored && Object.values(Env).includes(stored as Env) && stored !== Env.testnet) {
      return stored as Env;
    }
    const defaultEnv = getEnvironment();
    return defaultEnv === Env.testnet ? Env.stage : defaultEnv;
  });

  const handleEnvChange = (newEnv: Env) => {
    if (confirm('Changing environment will reload all examples. Continue?')) {
      setEnv(newEnv);
      localStorage.setItem('lombard-env', newEnv);
    }
  };

  return (
    <StarknetWalletProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<Layout env={env} onEnvChange={handleEnvChange} />}
          >
            <Route index element={<Navigate to="/staking" replace />} />
            <Route path="staking" element={<StarknetStakePage env={env} />} />
            <Route path="unstaking" element={<StarknetUnstakePage env={env} />} />
            <Route path="*" element={<Navigate to="/staking" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StarknetWalletProvider>
  );
}

export default App;
