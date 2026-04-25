import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { handleApiError } from './error-handler';
import type { ApiErrorResponse } from '@/constants/error-codes';

/**
 * HTTP client.
 *
 * Auth uses an HTTP-only session cookie (Redis-backed, 24h sliding TTL).
 * `withCredentials: true` tells the browser to send that cookie on every
 * request automatically — there is no token to read from JS and no
 * `Authorization` header to set. The backend CORS config must allow the
 * frontend origin with `credentials: true` for cross-origin dev.
 */
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

instance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => handleApiError(error),
);

export const customInstance = <T>(
  config: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => {
  return instance(config);
};

export default instance;
