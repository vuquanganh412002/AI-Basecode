import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import type { SessionPayload } from './auth-helpers';

const API_BASE = process.env.API_BASE_URL ?? 'https://localhost/api/v1';

/** Build a supertest agent with a mock session cookie attached. */
export function buildAuthedRequest(app: INestApplication, session: SessionPayload) {
  const sessionJson = JSON.stringify(session);
  const cookieValue = Buffer.from(sessionJson).toString('base64');
  return request(app.getHttpServer()).set('Cookie', `session_id=${cookieValue}`);
}

/** Extract `error_code` from a supertest response body. */
export function extractErrorCode(body: Record<string, unknown>): string {
  return body['error_code'] as string;
}

/** Build paginated query string from params object. */
export function paginationQuery(params: {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  [key: string]: unknown;
}): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) {
      q.set(k, String(v));
    }
  }
  return q.toString();
}

/** Fetch JSON from the live app (E2E / integration against Docker). */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ status: number; body: T }> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const body = (await res.json()) as T;
  return { status: res.status, body };
}
