import { Env } from '@lombard.finance/sdk';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/layout/Layout';
import { EvmWalletProvider } from './contexts/EvmWalletContext';
import { getEnvironment } from './lib/config';
import { SimpleStakingPage } from './pages/SimpleStakingPage';
import { StakeAndDeployPage } from './pages/StakeAndDeployPage';
import { UnstakePage } from './pages/UnstakePage';

function App() {
  const [env, setEnv] = useState<Env>(() => {
    const stored = localStorage.getItem('lombard-env');
    if (stored && Object.values(Env).includes(stored as Env)) {
      return stored as Env;
    }
    return getEnvironment();
  });

  const handleEnvChange = (newEnv: Env) => {
    if (confirm('Changing environment will reload all examples. Continue?')) {
      setEnv(newEnv);
      localStorage.setItem('lombard-env', newEnv);
    }
  };

  return (
    <EvmWalletProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<Layout env={env} onEnvChange={handleEnvChange} />}
          >
            <Route index element={<Navigate to="/staking" replace />} />
            <Route path="staking" element={<SimpleStakingPage env={env} />} />
            <Route path="unstaking" element={<UnstakePage env={env} />} />
            <Route path="stake-and-deploy" element={<StakeAndDeployPage env={env} />} />
            <Route path="*" element={<Navigate to="/staking" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </EvmWalletProvider>
  );
}

export default App;
