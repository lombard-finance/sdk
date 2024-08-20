import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../../common/utils/getErrorMessage';

type QueryFn<T> = () => Promise<T>;

interface UseQueryResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Custom hook for making a query and managing the query state.
 *
 * @template T - The type of data returned by the query.
 * @param queryFn The function that performs the query.
 * @param dependencies The dependencies that trigger a re-fetch of the query.
 * @param shouldFetch Determines whether the query should be fetched initially. Defaults to true.
 * @returns The query result object containing the data, error, loading state, and a refetch function.
 */
export function useQuery<T>(
  queryFn: QueryFn<T>,
  dependencies: any[] = [],
  shouldFetch = true,
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await queryFn();
      setData(result);
    } catch (err) {
      console.error(err);
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [queryFn, ...dependencies]);

  useEffect(() => {
    if (shouldFetch) {
      fetchData();
    }
  }, [shouldFetch, fetchData, ...dependencies]);

  return { data, error, isLoading, refetch: fetchData };
}

export default useQuery;
