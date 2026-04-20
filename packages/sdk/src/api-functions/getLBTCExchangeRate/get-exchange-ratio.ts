import axios from 'axios';
import BigNumber from 'bignumber.js';

import { getApiConfig } from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';
import {
  RATIO_TOKEN_MAP,
  RatioToken,
  Token,
} from '../../tokens/token-addresses';

type RatioResponse = {
  token_ratio: {
    /** The name of the token */
    name: RatioToken;
    /** The LBTC:BTC ratio */
    ratio: string;
    /** The 1/ration, BTC:LBTC ratio */
    price: string;
  }[];
};

const enabledTokens = [Token.LBTC] as const;
type EnabledTokens = (typeof enabledTokens)[number];

type RatioResult = {
  [token in EnabledTokens]: {
    /** The Token:BTC ratio. How many tokens will I get for 1 BTC */
    tokenBTCRatio: BigNumber;
    /** The BTC:Token ratio (1 / tokenBTCRatio). How many BTC will I get for 1 Token */
    BTCTokenRatio: BigNumber;
  };
};

/**
 * Gets the current exchange ratios for available tokens.
 */
export async function getExchangeRatio({ env }: IEnvParam) {
  const { baseApiUrl } = getApiConfig(env);
  const url = `${baseApiUrl}/api/v1/ratio`;

  const { data } = await axios.get<RatioResponse>(url);

  const ratios = data.token_ratio
    .map(r => ({
      token: RATIO_TOKEN_MAP[r.name],
      tokenBTCRatio: BigNumber(r.ratio),
      BTCTokenRatio: BigNumber(r.price),
    }))
    .filter(r => (enabledTokens as unknown as Token[]).includes(r.token));

  const result: RatioResult = ratios.reduce((acc, cur) => {
    const { token: _token, ...ratios } = cur;
    acc[cur.token as EnabledTokens] = ratios;
    return acc;
  }, {} as RatioResult);

  return result;
}
