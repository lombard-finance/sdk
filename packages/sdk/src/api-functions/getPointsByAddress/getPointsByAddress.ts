import axios from 'axios';
import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import { IEnvParam } from '../../common/parameters';
import { getApiConfig } from '../../common/api-config';
import BigNumber from 'bignumber.js';

export interface IGetPointsByAddressParameters extends IEnvParam {
  /**
   * The address of the points earner.
   */
  address: string;
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
   * The amount of LUX points earned from badges.
   */
  badgesPoints: number;
  /**
   * The total amount of LUX points (without badges points).
   */
  totalWithoutBadgesPoints: number;
}

interface IPointsResponse {
  holding_points?: number;
  protocol_points?: number;
  referee_points?: number;
  referrals_points?: number;
  total?: number;
  protocol_points_map?: IProtocolPointsBreakdown;
  badges?: number;
  total_without_badges?: number;
}

interface IOkxPointsResponse {
  data: boolean;
  points?: string | number;
}

interface IFlashEventPointsResponse {
  flashEvent1Points?: {
    result?: {
      rows?: { points?: string }[]; // take first entry
    };
  };
  flashEvent2Points?: {
    result?: {
      rows?: { totalPoints?: string }[]; // take first entry
    };
  };
}

/**
 * Retrieves the points earned by the provided address.
 * @param {IGetPointsByAddressParameters} parameters
 * @param {string} parameters.address - The account address.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @throws {Error} - Throws an error when the API endpoints cannot be determined or any of the API calls fail.
 */
export async function getPointsByAddress({
  address,
  env,
}: IGetPointsByAddressParameters): Promise<IPointsByAddress> {
  const { baseApiUrl, bffApiUrl } = getApiConfig(env);
  if (!bffApiUrl || !baseApiUrl) {
    throw new Error(
      `Could not determine the API endpoint for the provided environment: ${env || DEFAULT_ENV}`,
    );
  }

  const lombardPointsUrl = `${baseApiUrl}/api/v1/referral-system/season-1/points/${address}`;

  /**
   * TODO:
   * OKX and flash event points will be a part of the above endpoint soon.
   * Change this once it is implemented on the backend.
   */

  const okxPointsUrl = `${baseApiUrl}/api/v1/task/okx/user-task-verification?address=${address}&chain=1`;
  const flashEventsPointsUrl = `${bffApiUrl}/sentio-api/flash-event-points/${address}`;

  const lombardPointsRequest = axios.get<IPointsResponse>(lombardPointsUrl);
  const okxPointsRequest = axios.get<IOkxPointsResponse>(okxPointsUrl);
  const flashEventPointsRequest =
    axios.get<IFlashEventPointsResponse>(flashEventsPointsUrl);

  const [
    { data: lombardPointsData },
    { data: okxPointsData },
    { data: flashEventPointsData },
  ] = await Promise.all([
    lombardPointsRequest,
    okxPointsRequest,
    flashEventPointsRequest,
  ]);

  const okxPoints = parse(okxPointsData?.points);

  const flashEvent1Points = parse(
    flashEventPointsData?.flashEvent1Points?.result?.rows?.[0]?.points,
  );
  const flashEvent2Points = parse(
    flashEventPointsData?.flashEvent2Points?.result?.rows?.[0]?.totalPoints,
  );

  const holdingPoints = parse(lombardPointsData.holding_points);
  const protocolPoints = parse(lombardPointsData.protocol_points);
  const referralPoints = parse(lombardPointsData.referee_points).plus(
    parse(lombardPointsData.referrals_points),
  );

  const badgesPoints = parse(lombardPointsData.badges);

  const totalWithoutBadgesPoints = BigNumber.sum.apply(null, [
    holdingPoints,
    protocolPoints,
    referralPoints,
    okxPoints,
    flashEvent1Points,
    flashEvent2Points,
  ]);

  const totalPoints = totalWithoutBadgesPoints.plus(badgesPoints);

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

function parse(
  input: string | number | null | undefined,
  defaultValue = 0,
): BigNumber {
  return BigNumber(Number(input) || defaultValue);
}
