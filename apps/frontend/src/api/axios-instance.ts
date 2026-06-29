import axios, { type AxiosError } from 'axios';
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
  // Serialize array query params as repeated keys WITHOUT brackets
  // (`ids=1&ids=2`), not the axios default `ids[]=1`. The NestJS
  // ValidationPipe runs `forbidNonWhitelisted`, and the bracketed form
  // parses to a literal key `ids[]` on the server → "property ids[]
  // should not exist" 400. Repeat form parses to an `ids` array under
  // the DTO's declared property name. Single-value arrays arrive as a
  // scalar and each list DTO normalises them via @Transform → number[].
  paramsSerializer: { indexes: null },
});

instance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => handleApiError(error),
);

export default instance;
