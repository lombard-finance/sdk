import axios from 'axios';
import BigNumber from 'bignumber.js';
import { Address } from 'viem';

import { getApiConfig } from '../common/api-config';
import { IEnvParam } from '../common/parameters';
import { Token } from '../tokens/token-addresses';

type PositionAsset = 'ASSET_LBTC' | 'ASSET_UNSPECIFIED';
type PositionType = 'BALANCE_TYPE_HOLDING' | 'BALANCE_TYPE_DEFI';

type Response = {
  btc_price_usd: { price: number; timestamp: string };
  btc_value: number;
  btc_pnl: number;
  snapshot: [
    {
      asset: PositionAsset;
      type: PositionType;
      balance: number;
      pnl: number;
      rate: number;
    },
  ];
  last_updated: string;
  in_progress: boolean;
};

function mapRewardAssetToToken(asset: PositionAsset) {
  switch (asset) {
    case 'ASSET_LBTC':
      return Token.LBTC;
    default:
      return undefined;
  }
}

export type PositionsSummary = {
  /**
   * The current BTC price in USD, along with the timestamp
   * when the price was last fetched.
   */
  btcPrice: {
    /** The price of 1 BTC in USD. */
    price: BigNumber;
    /** Timestamp of the price data. */
    timestamp: Date;
  };
  /**
   * Total value of all holdings, denominated in BTC.
   */
  btcValue: BigNumber;
  /**
   * Total profit or loss across all assets, represented in BTC.
   */
  btcPnl: BigNumber;
  /**
   * A detailed snapshot of position data used in PnL calculation.
   */
  snapshot: {
    /**
     * The token associated with this position (e.g., `Token.LBTC`).
     * Can be `undefined` if unspecified.
     */
    token: Token | undefined;
    /**
     * The classification or source of the position.
     */
    type: PositionType;
    /**
     * The quantity of the token held.
     */
    balance: BigNumber;
    /**
     * The profit or loss for this specific position, in BTC.
     */
    pnl: BigNumber;
    /**
     * The conversion rate used to determine the BTC value of the balance.
     * `balance * rate = BTC equivalent`
     */
    rate: BigNumber;
  }[];
  /**
   * The timestamp when the PnL data was last updated.
   */
  lastUpdated: Date;
  /**
   * Indicates whether the backend is currently processing the PnL calculation.
   *
   * - `true`: A new calculation request was received, but the backend is experiencing high load
   *   or processing is not yet complete. The latest data is not yet available.
   *
   * - `false`: The most recent calculation has been completed and cached.
   *   Use `lastUpdated` to understand how fresh the data is:
   *   - If `lastUpdated` is recent (e.g., within the last few seconds), you're seeing the latest data.
   *   - If `lastUpdated` is up to 30 minutes old, you're seeing cached data from a recent request.
   *     The backend avoids recalculating within this caching window.
   */
  inProgress: boolean;
};

/** Retrieves the yield positions summary for the specified account address. */
export async function getPositionsSummary({
  account,
  env,
}: { account: Address } & IEnvParam) {
  const { baseApiUrl } = getApiConfig(env);

  const url = `${baseApiUrl}/api/v1/analytics/${account}/summary`;
  const { data } = await axios.get<Response>(url);

  const info: PositionsSummary = {
    btcPrice: {
      price: BigNumber(data.btc_price_usd.price || 0),
      timestamp: new Date(data.btc_price_usd.timestamp),
    },
    btcValue: BigNumber(data.btc_value || 0),
    btcPnl: BigNumber(data.btc_pnl || 0),
    snapshot: data.snapshot?.map(ds => ({
      token: mapRewardAssetToToken(ds.asset),
      type: ds.type,
      balance: BigNumber(ds.balance || 0),
      pnl: BigNumber(ds.pnl || 0),
      rate: BigNumber(ds.rate || 0),
    })),
    lastUpdated: new Date(data.last_updated),
    inProgress: Boolean(data.in_progress),
  };

  return info;
}
