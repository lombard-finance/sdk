import { useState } from 'react';
import { StarknetContext } from '../../hooks/use-connection';
import { WalletAccount } from 'starknet';

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const starknetContext = () => (Story: any) => {
  const [walletAccount, setWalletAccount] = useState<WalletAccount | undefined>(
    undefined,
  );

  return (
    <StarknetContext.Provider
      value={{
        walletAccount,
        setWalletAccount,
      }}
    >
      <Story />
    </StarknetContext.Provider>
  );
};
