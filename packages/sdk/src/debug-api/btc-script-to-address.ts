import { Env } from '@lombard.finance/sdk-common';

import { getApiConfig } from '../common/api-config';
import { httpRequest } from '../utils/http';

type BtcScriptToAddressResponse = {
  btc_address: string;
};

export const fetchBtcScriptToAddress = async (btcScript: string, env?: Env) => {
  const { baseApiUrl } = getApiConfig(env);
  try {
    const { data } = await httpRequest<BtcScriptToAddressResponse>({
      url: `${baseApiUrl}/api/v1/debug/btc-script-to-address/${btcScript}`,
      scope: 'public',
    });
    return data.btc_address;
  } catch {
    return undefined;
  }
};
