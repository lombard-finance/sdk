import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { getApiConfig } from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';

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
   * The amount of Lux points earned from badges.
   */
  badgesPoints: number;
  /**
   * The total amount of Lux points (without badges points).
   */
  totalWithoutBadgesPoints: number;
}

interface IPointsResponse {
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

  const lombardPointsRequest = axios.get<IPointsResponse>(lombardPointsUrl);

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
  const totalWithoutBadgesPoints = parse(
    lombardPointsData.total_without_badges,
  );
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

function parse(
  input: string | number | null | undefined,
  defaultValue = 0,
): BigNumber {
  return BigNumber(Number(input) || defaultValue);
}
