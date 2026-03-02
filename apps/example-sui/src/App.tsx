import { Env } from '@lombard.finance/sdk';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/layout/Layout';
import { getEnvironment } from './lib/config';
import { SuiStakePage } from './pages/SuiStakePage';
import { SuiUnstakePage } from './pages/SuiUnstakePage';

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
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Layout env={env} onEnvChange={handleEnvChange} />}
        >
          <Route index element={<Navigate to="/staking" replace />} />
          <Route path="staking" element={<SuiStakePage env={env} />} />
          <Route path="unstaking" element={<SuiUnstakePage env={env} />} />
          <Route path="*" element={<Navigate to="/staking" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
