import { Env } from '@lombard.finance/sdk-common';
import { Address } from 'viem';

import { getApiConfig } from '../common/api-config';
import { BlockchainIdentifier } from '../common/blockchain-identifier';
import { httpRequest } from '../utils/http';

type EvmByBtcAddressResponse = {
  metadata: {
    to_address: Address;
    to_blockchain: BlockchainIdentifier;
    referral: string;
  };
};

export const fetchEvmByBtcAddress = async (btcAddress: string, env?: Env) => {
  const { baseApiUrl } = getApiConfig(env);
  try {
    const { data } = await httpRequest<EvmByBtcAddressResponse>({
      url: `${baseApiUrl}/api/v1/debug/evm-by-btc-address/${btcAddress}`,
      scope: 'public',
    });
    return data.metadata;
  } catch {
    return undefined;
  }
};
