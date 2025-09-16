import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { getApiConfig } from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';

const CURRENT_SEASON = 2;
export interface IGetPointsByAddressParameters extends IEnvParam {
  /**
   * The address of the points earner.
   */
  address: string;
  /**
   * The season of the points.
   */
  season?: number;
}

export interface IProtocolPointsBreakdown {
  [protocolIdentifier: string]: number;
}

export interface IPointsByAddress {
  /**
   * The number of points earned by holding LBTC.
   */
  holdingPoints: number;
  /**
   * The number of points earned by taking positions in DeFi vaults.
   */
  protocolPoints: number;
  /**
   * The number of points earned by your referrals.
   */
  referralPoints: number;
  /**
   * The number of points earned in the OKX campaign.
   */
  okxPoints: number;
  /**
   * The number of points earned by participating in the first flash event.
   */
  flashEvent1Points: number;
  /**
   * The number of points earned by participating in the second flash event.
   */
  flashEvent2Points: number;
  /**
   * The total number of points.
   */
  totalPoints: number;
  /**
   * The breakdown of points earned from each protocol.
   */
  protocolPointsBreakdown: IProtocolPointsBreakdown;
  /**
   * The amount of Lux points earned from badges.
   */
  badgesPoints: number;
  /**
   * The total amount of Lux points (without badges points).
   */
  totalWithoutBadgesPoints: number;
}

export interface IPointsByAddressSeason2 extends IPointsByAddress {
  /**
   * The number of points earned by holding LBTC.
   */
  holdingPoints: number;
  /**
   * The number of points earned by taking positions in DeFi vaults.
   */
  protocolPoints: number;
  /**
   * The number of points earned by your referrals.
   */
  referralPoints: number;
  /**
   * The number of referee points.
   */
  refereePoints: number;
  /**
   * The total number of points.
   */
  totalPoints: number;
  /**
   * The breakdown of points earned from each protocol.
   */
  protocolPointsBreakdown: IProtocolPointsBreakdown;
  /**
   * The amount of Lux points earned from badges.
   */
  badgesPoints: number;
  /**
   * The number of points earned by checking in.
   */
  checkinPoints: number;
}

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
  etherfi_points: number;
  sale_points: number;
  protocol_points_map?: IProtocolPointsBreakdown;
}

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

const getLombardPointsUrl = (season: number, address: string, env: Env = DEFAULT_ENV) => {
  const { baseApiUrl } = getApiConfig(env);
  if (!baseApiUrl) {
    throw new Error(
      `Could not determine the API endpoint for the provided environment: ${env || DEFAULT_ENV}`,
    );
  }
  if (season === 1) {
    return `${baseApiUrl}/api/v1/referral-system/season-1/points/${address}`;
  }
  
  if (season === 2) {
    return `${baseApiUrl}/api/v1/referral-system/season-2/points/${address}`;
  } 
    
  throw new Error(`Invalid lux season: ${season}`);
};

/**
 * Fetches Season 1 points data
 */
async function fetchPointsSeason1({
  address,
  env,
}: Omit<IGetPointsByAddressParameters, 'season'>): Promise<IPointsByAddress> {
  const lombardPointsUrl = getLombardPointsUrl(1, address, env);
  const lombardPointsRequest = axios.get<IPointsResponseSeason1>(lombardPointsUrl);
  const { data: lombardPointsData } = await lombardPointsRequest;

  const okxPoints = parse(lombardPointsData.okx_campaign);
  const flashEvent1Points = parse(lombardPointsData.flash_event);
  const flashEvent2Points = parse(lombardPointsData.flash_event2);
  const holdingPoints = parse(lombardPointsData.holding_points);
  const protocolPoints = parse(lombardPointsData.protocol_points);
  const referralPoints = parse(lombardPointsData.referee_points).plus(
    parse(lombardPointsData.referrals_points),
  );
  const badgesPoints = parse(lombardPointsData.badges);
  const totalWithoutBadgesPoints = parse(lombardPointsData.total_without_badges);
  const totalPoints = parse(lombardPointsData.total);

  const protocolPointsBreakdown = Object.entries(
    lombardPointsData.protocol_points_map || {},
  ).reduce((acc, [k, v]) => {
    acc[k] = parse(v).toNumber();
    return acc;
  }, {} as IProtocolPointsBreakdown);

  return {
    holdingPoints: holdingPoints.toNumber(),
    protocolPoints: protocolPoints.toNumber(),
    referralPoints: referralPoints.toNumber(),
    okxPoints: okxPoints.toNumber(),
    flashEvent1Points: flashEvent1Points.toNumber(),
    flashEvent2Points: flashEvent2Points.toNumber(),
    totalPoints: totalPoints.toNumber(),
    protocolPointsBreakdown,
    badgesPoints: badgesPoints.toNumber(),
    totalWithoutBadgesPoints: totalWithoutBadgesPoints.toNumber(),
  };
}

/**
 * Fetches Season 2 points data
 */
async function fetchPointsSeason2({
  address,
  env,
}: Omit<IGetPointsByAddressParameters, 'season'>): Promise<IPointsByAddressSeason2> {
  const lombardPointsUrl = getLombardPointsUrl(2, address, env);
  const lombardPointsRequest = axios.get<IPointsResponseSeason2>(lombardPointsUrl);
  const { data: lombardPointsData } = await lombardPointsRequest;

  const holdingPoints = parse(lombardPointsData.holding_points);
  const protocolPoints = parse(lombardPointsData.protocol_points);
  const refereePoints = parse(lombardPointsData.referee_points);
  const referralPoints = parse(lombardPointsData.referrals_points);
  const badgePoints = parse(lombardPointsData.badge_points);
  const checkinPoints = parse(lombardPointsData.checkin_points);
  const totalPoints = parse(lombardPointsData.total);

  const protocolPointsBreakdown = Object.entries(
    lombardPointsData.protocol_points_map || {},
  ).reduce((acc, [k, v]) => {
    acc[k] = parse(v).toNumber();
    return acc;
  }, {} as IProtocolPointsBreakdown);

  return {
    holdingPoints: holdingPoints.toNumber(),
    protocolPoints: protocolPoints.toNumber(),
    referralPoints: referralPoints.toNumber(),
    refereePoints: refereePoints.toNumber(),
    badgesPoints: badgePoints.toNumber(), // Map badge_points to badgesPoints
    checkinPoints: checkinPoints.toNumber(),
    totalPoints: totalPoints.toNumber(),
    protocolPointsBreakdown,
    // Season 1 fields with defaults for compatibility
    okxPoints: 0,
    flashEvent1Points: 0,
    flashEvent2Points: 0,
    totalWithoutBadgesPoints: totalPoints.toNumber(), // Use total as fallback
  };
}

function parse(
  input: string | number | null | undefined,
  defaultValue = 0,
): BigNumber {
  return BigNumber(Number(input) || defaultValue);
}

/**
 * Retrieves the points earned by the provided address for Season 1.
 * @param parameters - The parameters object
 * @param parameters.address - The account address
 * @param parameters.env - The optional environment identifier
 * @param parameters.season - The season (1)
 * @throws {Error} - Throws an error when the API endpoints cannot be determined or any of the API calls fail.
 */
export async function getPointsByAddress(
  parameters: IGetPointsByAddressParameters & { season: 1 }
): Promise<IPointsByAddress>;

/**
 * Retrieves the points earned by the provided address for Season 2.
 * @param parameters - The parameters object
 * @param parameters.address - The account address
 * @param parameters.env - The optional environment identifier
 * @param parameters.season - The season (2)
 * @throws {Error} - Throws an error when the API endpoints cannot be determined or any of the API calls fail.
 */
export async function getPointsByAddress(
  parameters: IGetPointsByAddressParameters & { season: 2 }
): Promise<IPointsByAddressSeason2>;

/**
 * Retrieves the points earned by the provided address (defaults to Season 1).
 * @param parameters - The parameters object
 * @param parameters.address - The account address
 * @param parameters.env - The optional environment identifier
 * @param parameters.season - The optional season (defaults to 1)
 * @throws {Error} - Throws an error when the API endpoints cannot be determined or any of the API calls fail.
 */
export async function getPointsByAddress(
  parameters: IGetPointsByAddressParameters
): Promise<IPointsByAddress>;

/**
 * Implementation of getPointsByAddress function.
 */
export async function getPointsByAddress({
  address,
  env,
  season = CURRENT_SEASON,
}: IGetPointsByAddressParameters): Promise<IPointsByAddress | IPointsByAddressSeason2> {
  if (season === 2) {
    return fetchPointsSeason2({ address, env });
  }
  
  return fetchPointsSeason1({ address, env });
}
