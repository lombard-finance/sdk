import { Env } from '@lombard.finance/sdk-common';
import axios from 'axios';
import { Address } from 'viem';

import { getApiConfig } from '../common/api-config';
import { BlockchainIdentifier } from '../common/blockchain-identifier';

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
    const { data } = await axios.get<EvmByBtcAddressResponse>(
      `${baseApiUrl}/api/v1/debug/evm-by-btc-address/${btcAddress}`,
    );
    return data.metadata;
  } catch {
    return undefined;
  }
};
