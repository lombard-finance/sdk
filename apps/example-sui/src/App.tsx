import { Env } from '@lombard.finance/sdk';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/layout/Layout';
import { SuiWalletProvider } from './contexts/SuiWalletContext';
import { getEnvironment } from './lib/config';
import { SuiDepositPage } from './pages/SuiDepositPage';
import { SuiWithdrawPage } from './pages/SuiWithdrawPage';

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
    <SuiWalletProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<Layout env={env} onEnvChange={handleEnvChange} />}
          >
            <Route index element={<Navigate to="/staking" replace />} />
            <Route path="staking" element={<SuiDepositPage env={env} />} />
            <Route path="unstaking" element={<SuiWithdrawPage env={env} />} />
            <Route path="*" element={<Navigate to="/staking" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SuiWalletProvider>
  );
}

export default App;
