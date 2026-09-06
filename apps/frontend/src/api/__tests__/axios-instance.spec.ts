// Drives src/api/axios-instance.ts. The instance is the project's
// single HTTP client — assert (a) it carries withCredentials so the
// session cookie is attached on every request and (b) the response
// interceptor delegates rejections to handleApiError.

import { describe, it, expect, vi } from 'vitest';

// Capture handler so we can assert the interceptor forwards.
const handleApiError = vi.fn().mockRejectedValue(new Error('forwarded'));
vi.mock('@/api/error-handler', () => ({
  handleApiError: (e: unknown) => handleApiError(e),
}));

describe('axios-instance', () => {
  it('should be created with withCredentials: true and JSON Content-Type', async () => {
    const { default: instance } = await import('@/api/axios-instance');
    expect(instance.defaults.withCredentials).toBe(true);
    expect(instance.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('should resolve baseURL to a non-empty string (VITE_API_BASE_URL env or `/api` fallback)', async () => {
    const { default: instance } = await import('@/api/axios-instance');
    expect(typeof instance.defaults.baseURL).toBe('string');
    expect(instance.defaults.baseURL).toBeTruthy();
  });

  it('response interceptor should delegate axios errors to handleApiError', async () => {
    const { default: instance } = await import('@/api/axios-instance');
    // Drive the interceptor by invoking the registered rejection handler directly.
    // axios stores them in `instance.interceptors.response.handlers`.
    const handlers = (instance.interceptors.response as unknown as {
      handlers: { fulfilled: unknown; rejected: (e: unknown) => unknown }[];
    }).handlers;
    const rejected = handlers.find((h) => typeof h.rejected === 'function');
    expect(rejected).toBeDefined();
    const err = { isAxiosError: true, response: { status: 500 } };
    await expect(rejected!.rejected(err)).rejects.toThrow('forwarded');
    expect(handleApiError).toHaveBeenCalledWith(err);
  });

  it('response interceptor should pass a successful response through unchanged', async () => {
    const { default: instance } = await import('@/api/axios-instance');
    const handlers = (instance.interceptors.response as unknown as {
      handlers: { fulfilled: (r: unknown) => unknown; rejected: unknown }[];
    }).handlers;
    const fulfilled = handlers.find((h) => typeof h.fulfilled === 'function');
    expect(fulfilled).toBeDefined();
    const response = { status: 200, data: { ok: true } };

    expect(fulfilled!.fulfilled(response)).toBe(response);
  });
});
