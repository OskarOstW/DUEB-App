import { QueryClient } from '@tanstack/react-query';
import { TIMING } from '../config/constants';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: TIMING.MAX_RETRIES,
      retryDelay: (attempt) => TIMING.RETRY_DELAY * (attempt + 1),
      refetchOnWindowFocus: false,
    },
  },
});
