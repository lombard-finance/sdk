import { Idl } from '@coral-xyz/anchor';

import { getConfig, networkToEnv } from '../const/getConfig';
import { SolanaNetwork } from '../types';
import mailboxIdl from './mailbox.json';

export const getMailboxIdl = (network: SolanaNetwork): Idl => {
  const config = getConfig(networkToEnv[network]);
  if (!config.mailbox) {
    throw new Error(
      `Mailbox program not configured for network: ${network}`,
    );
  }
  const programIdl = { ...mailboxIdl } as unknown as Idl;
  programIdl.address = config.mailbox;
  return programIdl;
};
