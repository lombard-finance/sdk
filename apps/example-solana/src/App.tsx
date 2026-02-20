import { Env } from '@lombard.finance/sdk';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/layout/Layout';
import { getEnvironment } from './lib/config';
import { SolanaStakePage } from './pages/SolanaStakePage';
import { SolanaUnstakePage } from './pages/SolanaUnstakePage';

function App() {
  const [env, setEnv] = useState<Env>(() => getEnvironment());

  const handleEnvChange = (newEnv: Env) => {
    if (confirm('Changing environment will reload all examples. Continue?')) {
      setEnv(newEnv);
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Layout env={env} onEnvChange={handleEnvChange} />}
        >
          <Route index element={<Navigate to="/staking" replace />} />
          <Route path="staking" element={<SolanaStakePage env={env} />} />
          <Route path="unstaking" element={<SolanaUnstakePage env={env} />} />
          <Route path="*" element={<Navigate to="/staking" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
