import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import axios from 'axios';
import BigNumber from 'bignumber.js';

import { getApiConfig } from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';

const CURRENT_SEASON = 2;

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/**
 * Parameters for fetching points by address.
 */
export interface IGetPointsByAddressParameters extends IEnvParam {
  /** The address of the points earner. */
  address: string;
  /** The season to fetch (defaults to CURRENT_SEASON). */
  season?: number;
}

/**
 * Breakdown of points earned from each supported DeFi protocol.
 */
export interface IProtocolPointsBreakdown {
  [protocolName: string]: number;
}

/**
 * Core points shared across all seasons.
 */
export interface IPointsBase {
  /** Points earned by holding LBTC. */
  holdingPoints: number;
  /** Points earned by taking positions in DeFi vaults. */
  protocolPoints: number;
  /** Points earned from referrals. */
  referralPoints: number;
  /** Total points earned. */
  totalPoints: number;
  /** Detailed breakdown of protocol-specific points. */
  protocolPointsBreakdown: IProtocolPointsBreakdown;
  /** Lux points earned from badges. */
  badgesPoints: number;
  /** Total Lux points excluding badges (only required in some seasons). */
  totalWithoutBadgesPoints?: number;
}

/**
 * Points specific to Season 1.
 */
export interface IPointsByAddressSeason1 extends IPointsBase {
  /** Points earned in the OKX campaign. */
  okxPoints: number;
  /** Points earned in the first flash event. */
  flashEvent1Points: number;
  /** Points earned in the second flash event. */
  flashEvent2Points: number;
}

/**
 * Points specific to Season 2.
 */
export interface IPointsByAddressSeason2 extends IPointsBase {
  /** Points earned from referees. */
  refereePoints: number;
  /** Points earned by checking in. */
  checkinPoints: number;
}

/**
 * Raw API response format for Season 1.
 */
interface IPointsResponseSeason1 {
  holding_points: number;
  protocol_points: number;
  referee_points: number;
  referrals_points: number;
  total: number;
  flash_event: number;
  badges: number;
  total_without_badges: number;
  okx_campaign: number;
  flash_event2: number;
  protocol_points_map?: IProtocolPointsBreakdown;
}

/**
 * Raw API response format for Season 2.
 */
interface IPointsResponseSeason2 {
  holding_points: number;
  protocol_points: number;
  referee_points: number;
  referrals_points: number;
  total: number;
  protocol_points_map?: IProtocolPointsBreakdown;
  badge_points: number;
  checkin_points: number;
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

/**
 * Parses a number-like input into a BigNumber.
 *
 * @param input - The value to parse.
 * @param defaultValue - Value to use if input is invalid or undefined.
 * @returns A BigNumber representing the parsed value.
 */
function parse(
  input: string | number | null | undefined,
  defaultValue = 0,
): BigNumber {
  return BigNumber(Number(input) || defaultValue);
}

/**
 * Converts a protocol points map to a strongly typed breakdown object.
 *
 * @param map - Optional protocol points map from the API.
 * @returns A normalized breakdown object with numeric values.
 */
function toProtocolBreakdown(
  map: IProtocolPointsBreakdown | undefined,
): IProtocolPointsBreakdown {
  return Object.entries(map || {}).reduce((acc, [k, v]) => {
    acc[k] = parse(v).toNumber();
    return acc;
  }, {} as IProtocolPointsBreakdown);
}

/**
 * Constructs the Lombard points API endpoint for the given season and address.
 *
 * @param season - The Lux points season (e.g., 1 or 2).
 * @param address - Wallet address to query.
 * @param env - Target environment (defaults to DEFAULT_ENV).
 * @throws If the API endpoint cannot be determined or the season is invalid.
 */
function getLombardPointsUrl(
  season: number,
  address: string,
  env: Env = DEFAULT_ENV,
): string {
  const { baseApiUrl } = getApiConfig(env);
  if (!baseApiUrl) {
    throw new Error(
      `Could not determine the API endpoint for the provided environment: ${
        env || DEFAULT_ENV
      }`,
    );
  }

  switch (season) {
    case 1:
      return `${baseApiUrl}/api/v1/referral-system/season-1/points/${address}`;
    case 2:
      return `${baseApiUrl}/api/v1/referral-system/season-2/points/${address}`;
    default:
      throw new Error(`Invalid Lux season: ${season}`);
  }
}

/* -------------------------------------------------------------------------- */
/*                                Fetchers                                    */
/* -------------------------------------------------------------------------- */

/**
 * Fetches and parses Season 1 points for a given address.
 *
 * @param params - Address and environment parameters.
 * @returns A typed object containing all Season 1 point metrics.
 */
async function fetchPointsSeason1({
  address,
  env,
}: Omit<
  IGetPointsByAddressParameters,
  'season'
>): Promise<IPointsByAddressSeason1> {
  const { data } = await axios.get<IPointsResponseSeason1>(
    getLombardPointsUrl(1, address, env),
  );

  const referralPoints = parse(data.referee_points).plus(
    parse(data.referrals_points),
  );

  return {
    holdingPoints: parse(data.holding_points).toNumber(),
    protocolPoints: parse(data.protocol_points).toNumber(),
    referralPoints: referralPoints.toNumber(),
    okxPoints: parse(data.okx_campaign).toNumber(),
    flashEvent1Points: parse(data.flash_event).toNumber(),
    flashEvent2Points: parse(data.flash_event2).toNumber(),
    totalPoints: parse(data.total).toNumber(),
    protocolPointsBreakdown: toProtocolBreakdown(data.protocol_points_map),
    badgesPoints: parse(data.badges).toNumber(),
    totalWithoutBadgesPoints: parse(data.total_without_badges).toNumber(),
  };
}

/**
 * Fetches and parses Season 2 points for a given address.
 *
 * @param params - Address and environment parameters.
 * @returns A typed object containing all Season 2 point metrics.
 */
async function fetchPointsSeason2({
  address,
  env,
}: Omit<
  IGetPointsByAddressParameters,
  'season'
>): Promise<IPointsByAddressSeason2> {
  const { data } = await axios.get<IPointsResponseSeason2>(
    getLombardPointsUrl(2, address, env),
  );

  return {
    holdingPoints: parse(data.holding_points).toNumber(),
    protocolPoints: parse(data.protocol_points).toNumber(),
    referralPoints: parse(data.referrals_points).toNumber(),
    refereePoints: parse(data.referee_points).toNumber(),
    badgesPoints: parse(data.badge_points).toNumber(),
    checkinPoints: parse(data.checkin_points).toNumber(),
    totalPoints: parse(data.total).toNumber(),
    protocolPointsBreakdown: toProtocolBreakdown(data.protocol_points_map),
    totalWithoutBadgesPoints: parse(data.total).toNumber(),
  };
}

/* -------------------------------------------------------------------------- */
/*                               Public API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Retrieves Season 1 points for a given address.
 *
 * @param parameters - Address and environment parameters.
 * @returns A Season 1 points object.
 */
export async function getPointsByAddress(
  parameters: IGetPointsByAddressParameters & { season: 1 },
): Promise<IPointsByAddressSeason1>;

/**
 * Retrieves Season 2 points for a given address.
 *
 * @param parameters - Address and environment parameters.
 * @returns A Season 2 points object.
 */
export async function getPointsByAddress(
  parameters: IGetPointsByAddressParameters & { season: 2 },
): Promise<IPointsByAddressSeason2>;

/**
 * Retrieves points for the given address.
 * Defaults to the current season if none is specified.
 *
 * @param parameters - Address and optional environment/season parameters.
 * @returns A points object matching the requested or current season.
 */
export async function getPointsByAddress(
  parameters: IGetPointsByAddressParameters,
): Promise<IPointsByAddressSeason1 | IPointsByAddressSeason2>;

/**
 * Implementation of getPointsByAddress with overloads.
 */
export async function getPointsByAddress({
  address,
  env,
  season = CURRENT_SEASON,
}: IGetPointsByAddressParameters): Promise<
  IPointsByAddressSeason1 | IPointsByAddressSeason2
> {
  return season === 2
    ? fetchPointsSeason2({ address, env })
    : fetchPointsSeason1({ address, env });
}

/**
 * Convenience wrapper for fetching Season 1 points.
 *
 * @param params - Address and environment parameters.
 */
export const getLuxSeason1Points = (
  params: Omit<IGetPointsByAddressParameters, 'season'>,
) => getPointsByAddress({ ...params, season: 1 });

/**
 * Convenience wrapper for fetching Season 2 points.
 *
 * @param params - Address and environment parameters.
 */
export const getLuxSeason2Points = (
  params: Omit<IGetPointsByAddressParameters, 'season'>,
) => getPointsByAddress({ ...params, season: 2 });
