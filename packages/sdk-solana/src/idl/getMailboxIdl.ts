import { Idl } from '@coral-xyz/anchor';
import { Env } from '@lombard.finance/sdk-common';

import { getConfig } from '../const/getConfig';
import mailboxIdl from './mailbox.json';

export const getMailboxIdl = (env: Env): Idl => {
  const config = getConfig(env);
  if (!config.mailbox) {
    throw new Error(
      `Mailbox program not configured for env: ${env}`,
    );
  }
  const programIdl = { ...mailboxIdl } as unknown as Idl;
  programIdl.address = config.mailbox;
  return programIdl;
};
