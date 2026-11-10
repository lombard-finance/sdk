import { Env } from '@lombard.finance/sdk';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/layout/Layout';
import { EvmWalletProvider } from './contexts/EvmWalletContext';
import { getEnvironment } from './lib/config';
import { SimpleDepositPage } from './pages/SimpleDepositPage';
import { DeployPage } from './pages/DeployPage';
import { WithdrawPage } from './pages/WithdrawPage';

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
            <Route path="staking" element={<SimpleDepositPage env={env} />} />
            <Route path="unstaking" element={<WithdrawPage env={env} />} />
            <Route
              path="stake-and-deploy"
              element={<DeployPage env={env} />}
            />
            <Route path="*" element={<Navigate to="/staking" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </EvmWalletProvider>
  );
}

export default App;
