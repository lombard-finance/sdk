import { Env } from '@lombard.finance/sdk';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/layout/Layout';
import { getEnvironment } from './lib/config';
import { SimpleStakingPage } from './pages/SimpleStakingPage';
import { StakeAndBakePage } from './pages/StakeAndBakePage';
import { UnstakePage } from './pages/UnstakePage';

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
          <Route path="staking" element={<SimpleStakingPage env={env} />} />
          <Route path="unstaking" element={<UnstakePage env={env} />} />
          <Route path="stake-and-bake" element={<StakeAndBakePage env={env} />} />
          <Route path="*" element={<Navigate to="/staking" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
