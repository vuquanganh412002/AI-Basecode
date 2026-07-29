import axios, { type AxiosError } from 'axios';
import { handleApiError } from './error-handler';
import type { ApiErrorResponse } from '@/constants/error-codes';

/**
 * HTTP クライアント。
 *
 * 認証は HTTP-only セッション cookie（Redis, 24h スライディングTTL）。
 * `withCredentials: true` でブラウザが毎リクエストに cookie を自動送信する
 * （JS から読むトークンも Authorization ヘッダもなし）。クロスオリジン開発では
 * BE の CORS が frontend origin を `credentials: true` で許可する必要あり。
 */
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  // 配列クエリを bracket なしの繰り返しキー（`ids=1&ids=2`）で送る。
  // axios 既定の `ids[]=1` は NestJS ValidationPipe の forbidNonWhitelisted で
  // リテラルキー `ids[]` と解釈され 400（property ids[] should not exist）。
  // 繰り返し形式なら DTO 宣言名の `ids` 配列になる。単一要素はスカラで届き
  // 各 list DTO が @Transform で number[] に正規化する。
  paramsSerializer: { indexes: null },
});

instance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => handleApiError(error),
);

export default instance;
