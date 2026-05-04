import { expect } from 'vitest';
import type { Response } from 'supertest';

/** Assert API returned the expected error_code with the expected HTTP status. */
export function assertApiError(res: Response, status: number, errorCode: string): void {
  expect(res.status).toBe(status);
  expect(res.body).toMatchObject({ error_code: errorCode });
}

/** Assert 401 UNAUTHORIZED. */
export function assertUnauthorized(res: Response): void {
  assertApiError(res, 401, 'UNAUTHORIZED');
}

/** Assert 403 FORBIDDEN. */
export function assertForbidden(res: Response): void {
  assertApiError(res, 403, 'FORBIDDEN');
}

/** Assert 403 DATA_SCOPE_VIOLATION. */
export function assertDataScopeViolation(res: Response): void {
  assertApiError(res, 403, 'DATA_SCOPE_VIOLATION');
}

/** Assert 404 NOT_FOUND. */
export function assertNotFound(res: Response): void {
  assertApiError(res, 404, 'NOT_FOUND');
}

/** Assert paginated list response shape. */
export function assertPaginatedResponse(
  body: Record<string, unknown>,
  expectedTotal?: number,
): void {
  expect(body).toHaveProperty('data');
  expect(body).toHaveProperty('meta');
  expect(body['meta']).toMatchObject({
    total: expect.any(Number),
    page: expect.any(Number),
    per_page: expect.any(Number),
    total_pages: expect.any(Number),
  });
  if (expectedTotal !== undefined) {
    expect((body['meta'] as Record<string, number>)['total']).toBe(expectedTotal);
  }
  expect(Array.isArray(body['data'])).toBe(true);
}

/** Assert VALIDATION_ERROR with optional field-level errors. */
export function assertValidationError(
  res: Response,
  fields?: string[],
): void {
  assertApiError(res, 400, 'VALIDATION_ERROR');
  if (fields) {
    const errorFields: string[] = (
      res.body as { errors?: { field: string }[] }
    ).errors?.map((e) => e.field) ?? [];
    for (const field of fields) {
      expect(errorFields).toContain(field);
    }
  }
}
