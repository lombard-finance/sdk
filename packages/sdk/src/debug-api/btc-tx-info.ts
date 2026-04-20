import { Env } from '@lombard.finance/sdk-common';
import axios from 'axios';
import { Address } from 'viem';

import { getApiConfig } from '../common/api-config';
import { BlockchainIdentifier } from '../common/blockchain-identifier';

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
    const { data } = await axios.get<BtcTxInfoResponse>(
      `${baseApiUrl}/api/v1/debug/btc-tx-info/${txHash}`,
    );
    return data;
  } catch {
    return undefined;
  }
};
