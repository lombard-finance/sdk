import { Env } from '@lombard.finance/sdk-common';
import axios from 'axios';
import { getApiConfig } from '../common/api-config';

type BtcScriptToAddressResponse = {
  btc_address: string;
};

export const fetchBtcScriptToAddress = async (btcScript: string, env?: Env) => {
  const { baseApiUrl } = getApiConfig(env);
  try {
    const { data } = await axios.get<BtcScriptToAddressResponse>(
      `${baseApiUrl}/api/v1/debug/btc-script-to-address/${btcScript}`,
    );
    return data.btc_address;
  } catch {
    return undefined;
  }
};
