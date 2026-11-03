import { DEFAULT_ENV } from '@lombard.finance/sdk-common';

import { getApiConfig } from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';
import { httpRequest } from '../../utils/http';
import type { Deposit } from '../getDepositsByAddress/getDepositsByAddress';
import type {
  IGetUnstakesByAddressParameters,
  Unstake,
} from '../getUnstakesByAddress/getUnstakesByAddress';
import {
  type ChainIdsByFamily,
  getMovementChainFamily,
  mapMovementToBridge,
  mapMovementToDeposit,
  mapMovementToUnstake,
  type Movement,
  type PortfolioBridge,
} from './movements';

/**
 * Readers for the v2 portfolio lists:
 *
 * - `/v2/portfolio/{address}/deposits`, the BTC and BTC.b deposits whose
 *   destination is `address`
 * - `/v2/portfolio/{address}/withdrawals`, redeems to BTC and LBTC to BTC.b
 * - `/v2/portfolio/{address}/bridges`, transfers between chains
 *
 * Every route is user-scoped: the wallet token must belong to `address`, and
 * the request is not sent without one.
 *
 * @module api-functions/getPortfolioMovements
 */

export interface IGetPortfolioMovementsParams extends IEnvParam {
  /** The wallet address. Its wallet token must be available through `auth`. */
  address: string;
}

export type IGetPortfolioWithdrawalsParams = IGetPortfolioMovementsParams &
  Pick<IGetUnstakesByAddressParameters, 'options'>;

type ListKey = 'deposits' | 'withdrawals' | 'bridges';

type ListResponse = Partial<Record<ListKey, Movement[]>> & {
  page_info?: { limit?: number | string; total?: number | string };
};

/** The gateway refuses a larger page. */
const PAGE_LIMIT = 100;
/** Stops a misreported `total` from paging forever: 2,000 movements. */
const MAX_PAGES = 20;

async function fetchMovements(
  list: ListKey,
  {
    address,
    env = DEFAULT_ENV,
    auth,
    getAuthToken,
  }: IGetPortfolioMovementsParams,
): Promise<Movement[]> {
  if (!address) throw new Error('No address specified.');

  const { baseApiV2Url } = getApiConfig(env);
  const url = `${baseApiV2Url}/v2/portfolio/${address}/${list}`;
  const movements: Movement[] = [];
  const seenIds = new Set<string>();

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * PAGE_LIMIT;
    const { data } = await httpRequest<ListResponse>({
      url,
      params: { limit: PAGE_LIMIT, offset, order: 'desc' },
      scope: 'userScoped',
      auth,
      getAuthToken,
    });

    // A movement recorded between two reads shifts the newest-first order by
    // one row, so the next page can repeat the last one. Keep the first copy.
    const rows = data?.[list] ?? [];
    for (const row of rows) {
      if (row.id && seenIds.has(row.id)) continue;
      if (row.id) seenIds.add(row.id);
      movements.push(row);
    }

    // `offset` and `total` count backend rows, including ones the gateway
    // could not map and left out, so a page can come back short or empty with
    // more to read. Page by the limit until `total`; only a response without a
    // total ends on a short page.
    const total = Number(data?.page_info?.total ?? 0);
    const isLastPage =
      total > 0 ? offset + PAGE_LIMIT >= total : rows.length < PAGE_LIMIT;
    if (isLastPage) return movements;
  }

  return movements;
}

const chainIdRequests = new Map<string, Promise<ChainIdsByFamily>>();

/**
 * The gateway's chain list, read once per host. It covers the networks the
 * SDK has no name for, so a bridge on one of those lanes keeps its numeric
 * chain id. A failed read yields an empty map and is retried next time.
 */
function getChainIdsByFamily(env: IEnvParam['env']): Promise<ChainIdsByFamily> {
  const { baseApiV2Url } = getApiConfig(env ?? DEFAULT_ENV);
  let request = chainIdRequests.get(baseApiV2Url);
  if (!request) {
    request = httpRequest<{ chains?: { name?: string; chain_id?: string }[] }>({
      url: `${baseApiV2Url}/v2/chains`,
    })
      .then(({ data }) => {
        const byFamily = new Map<string, string>();
        for (const chain of data?.chains ?? []) {
          const family = getMovementChainFamily(chain.name);
          if (family && chain.chain_id) byFamily.set(family, chain.chain_id);
        }
        return byFamily as ChainIdsByFamily;
      })
      .catch(() => {
        chainIdRequests.delete(baseApiV2Url);
        return new Map<string, string>() as ChainIdsByFamily;
      });
    chainIdRequests.set(baseApiV2Url, request);
  }
  return request;
}

/**
 * Every deposit whose destination is `address`, newest first: BTC deposits
 * and BTC.b deposits alike, as one list. The v2 counterpart of
 * {@link getDepositsByAddress}, returning the same `Deposit` shape.
 *
 * @throws `LombardError` with `AuthErrorCode.MISSING_TOKEN` when no wallet
 *   token is available, before anything is sent.
 */
export async function getPortfolioDeposits(
  params: IGetPortfolioMovementsParams,
): Promise<Deposit[]> {
  const movements = await fetchMovements('deposits', params);
  const chainIds = await getChainIdsByFamily(params.env);
  return movements
    .map((movement) => mapMovementToDeposit(movement, params.env, chainIds))
    .sort((a, b) => (b.blockTime ?? 0) - (a.blockTime ?? 0));
}

/**
 * Every withdrawal `address` has made: redeems to BTC and LBTC to BTC.b. The
 * v2 counterpart of {@link getUnstakesByAddress}, returning the same `Unstake`
 * shape and honouring the same filters.
 *
 * @throws `LombardError` with `AuthErrorCode.MISSING_TOKEN` when no wallet
 *   token is available, before anything is sent.
 */
export async function getPortfolioWithdrawals({
  options,
  ...params
}: IGetPortfolioWithdrawalsParams): Promise<Unstake[]> {
  const movements = await fetchMovements('withdrawals', params);
  const chainIds = await getChainIdsByFamily(params.env);
  return movements
    .map((movement) => mapMovementToUnstake(movement, params.env, chainIds))
    .filter(matchesV1Options(options));
}

/**
 * The v1 route's filters, applied to the v2 list. Each flag asks for only its
 * kind and no flag asks for both: `show_unstakes` for LBTC paid out in BTC,
 * `show_redeems` for the redeems (`isNative`). `to_native` narrows the redeems
 * to those that stay on chain as BTC.b and leaves the unstakes alone.
 */
function matchesV1Options(
  options: IGetPortfolioWithdrawalsParams['options'],
): (unstake: Unstake) => boolean {
  const anyKind = Boolean(options?.show_unstakes || options?.show_redeems);
  const showUnstakes = anyKind ? Boolean(options?.show_unstakes) : true;
  const showRedeems = anyKind ? Boolean(options?.show_redeems) : true;
  return (unstake) => {
    if (!unstake.isNative) return showUnstakes;
    return (
      showRedeems && (!options?.to_native || unstake.toChainId !== 'bitcoin')
    );
  };
}

/**
 * Every bridge transfer `address` has sent between chains.
 *
 * @throws `LombardError` with `AuthErrorCode.MISSING_TOKEN` when no wallet
 *   token is available, before anything is sent.
 */
export async function getPortfolioBridges(
  params: IGetPortfolioMovementsParams,
): Promise<PortfolioBridge[]> {
  const movements = await fetchMovements('bridges', params);
  const chainIds = await getChainIdsByFamily(params.env);
  return movements.map((movement) =>
    mapMovementToBridge(movement, params.env, chainIds),
  );
}
