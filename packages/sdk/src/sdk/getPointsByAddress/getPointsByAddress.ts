import axios from 'axios';
import { defaultEnv } from '@lombard.finance/sdk-common';
import { IEnvParam } from '../../common/types/internalTypes';
import { getApiConfig } from '../apiConfig';

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
   * The number of points earned by participating in the flash events.
   */
  flashEventPoints: number;
  /**
   * The total number of points.
   */
  totalPoints: number;
  /**
   * The breakdown of points earned from each protocol.
   */
  protocolPointsBreakdown: IProtocolPointsBreakdown;
}

interface IPointsResponse {
  holding_points?: number;
  protocol_points?: number;
  referee_points?: number;
  referrals_points?: number;
  total?: number;
  protocol_points_map?: IProtocolPointsBreakdown;
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
 * @throws {Error} - Throws an error when the API endpoints cannot be determined or any of the API calls fail.
 */
export async function getPointsByAddress({
  address,
  env,
}: IGetPointsByAddressParameters): Promise<IPointsByAddress> {
  const { baseApiUrl, bffApiUrl } = getApiConfig(env);
  if (!bffApiUrl || !baseApiUrl) {
    throw new Error(
      `Could not determine the API endpoint for the provided environment: ${env || defaultEnv}`,
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
  const flashEventPoints = flashEvent1Points + flashEvent2Points;

  const holdingPoints = parse(lombardPointsData.holding_points);
  const protocolPoints = parse(lombardPointsData.protocol_points);
  const referralPoints =
    parse(lombardPointsData.referee_points) +
    parse(lombardPointsData.referrals_points);

  const totalPoints =
    holdingPoints +
    protocolPoints +
    referralPoints +
    okxPoints +
    flashEventPoints;

  const protocolPointsBreakdown = Object.entries(
    lombardPointsData.protocol_points_map || {},
  ).reduce((acc, [k, v]) => {
    acc[k] = parse(v);
    return acc;
  }, {} as IProtocolPointsBreakdown);

  return {
    holdingPoints,
    protocolPoints,
    referralPoints,
    okxPoints,
    flashEventPoints,
    totalPoints,
    protocolPointsBreakdown,
  };
}

function parse(
  input: string | number | null | undefined,
  defaultValue = 0,
): number {
  return Number(input) || defaultValue;
}
