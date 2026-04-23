import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { handleApiError } from './error-handler';
import type { ApiErrorResponse } from '@/constants/error-codes';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

instance.interceptors.request.use(async (config) => {
  // Dynamic import to avoid circular dependency with auth.store (which uses axios).
  const { useAuthStore } = await import('@/stores/auth.store');
  const authStore = useAuthStore();
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`;
  }
  return config;
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
