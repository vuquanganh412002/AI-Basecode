import { API_PREFIX } from '@/common/constants/api.constants';

/**
 * Build an absolute API URL for integration tests, prepending the same
 * version prefix `main.ts` applies via `setGlobalPrefix(API_PREFIX)`.
 *
 *   apiUrl('auth/login')   → '/api/v1/auth/login'
 *   apiUrl('/auth/login')  → '/api/v1/auth/login'
 *   apiUrl(`ja/${id}`)     → '/api/v1/ja/5'
 *
 * Existing `'/api/v1/...'` literal URLs in older specs continue to work —
 * they hit the same routes. Migrate to `apiUrl(...)` opportunistically so
 * a future version bump (`v1` → `v2`) is a one-liner.
 */
export function apiUrl(path = ''): string {
  const trimmed = path.replace(/^\/+/, '');
  return trimmed ? `/${API_PREFIX}/${trimmed}` : `/${API_PREFIX}`;
}
