import type { Env } from '@lombard.finance/sdk-common';
import axios from 'axios';

import { getHttpClient } from '../common/http-client';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type FetchAllPaginatedParameters<T> = {
  /** The API endpoint. */
  endpoint: string | URL;
  /** Function to extract items array from API response. */
  extractItems: (data: unknown) => T[];
  /** The additional query parameters. */
  query?: Record<string, string | undefined>;
  /** The page size, default: 1000 */
  pageSize?: number;
  /** The maximum amount of expected records. */
  maxRecords?: number;
  /**
   * Environment. When provided, requests go through the SDK's authed HTTP
   * client so the wallet JWT is attached; omit to use the bare client.
   */
  env?: Env;
};

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

/**
 * Generic helper to fetch all paginated items from an API endpoint.
 * Automatically handles `limit`, `offset` and the `has_more` flag.
 * If `has_more` is missing, pagination stops.
 *
 * @template T - Type of individual item
 * @param {FetchAllPaginatedParameters<T>} params - Parameters for fetching all items

 *
 * @returns {Promise<T[]>} - All items fetched across pages
 */
export async function fetchAllPaginated<T>({
  endpoint,
  extractItems,
  query = {},
  pageSize = 1_000,
  maxRecords,
  env,
}: FetchAllPaginatedParameters<T>): Promise<T[]> {
  const client = env !== undefined ? getHttpClient(env) : axios;
  let allItems: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(endpoint);

    url.searchParams.set('limit', pageSize.toString());
    url.searchParams.set('offset', offset.toString());
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const { data } = await client.get(url.toString());
    const items = extractItems(data);

    allItems = allItems.concat(items);
    offset += items.length;

    if (maxRecords && allItems.length >= maxRecords) {
      allItems = allItems.slice(0, maxRecords);
      break;
    }

    hasMore = items.length > 0 && (data.has_more ?? false);
  }

  return allItems;
}
