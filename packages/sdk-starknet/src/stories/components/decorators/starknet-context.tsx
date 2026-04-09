import { useState } from "react";
import { WalletAccount } from "starknet";

import { StarknetContext } from "../../hooks/use-connection";

export const starknetContext = () => (Story: React.ComponentType) => {
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
