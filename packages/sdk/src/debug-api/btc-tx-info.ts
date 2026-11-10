import { Env } from '@lombard.finance/sdk-common';
import { Address } from 'viem';

import { getApiConfig } from '../common/api-config';
import { BlockchainIdentifier } from '../common/blockchain-identifier';
import { httpRequest } from '../utils/http';

type BtcTxInfoResponse = {
  addresses: [
    {
      btc_address: string;
      type: 'ADDRESS_TYPE_DEPOSIT';
      deposit_metadata: {
        to_address: Address;
        to_blockchain: BlockchainIdentifier;
      };
      created_at: string;
    },
  ];
};

export const fetchBtcTxInfo = async (txHash: string, env?: Env) => {
  const { baseApiUrl } = getApiConfig(env);
  try {
    const { data } = await httpRequest<BtcTxInfoResponse>({
      url: `${baseApiUrl}/api/v1/debug/btc-tx-info/${txHash}`,
      scope: 'public',
    });
    return data;
  } catch {
    return undefined;
  }
};
