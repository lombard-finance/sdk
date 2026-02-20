import { Env } from '@lombard.finance/sdk';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/layout/Layout';
import { getEnvironment } from './lib/config';
import { StarknetStakePage } from './pages/StarknetStakePage';
import { StarknetUnstakePage } from './pages/StarknetUnstakePage';

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
          <Route path="staking" element={<StarknetStakePage />} />
          <Route path="unstaking" element={<StarknetUnstakePage />} />
          <Route path="*" element={<Navigate to="/staking" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
