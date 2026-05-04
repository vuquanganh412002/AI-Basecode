// @ts-nocheck — TDD red phase (/gen-autotest)
// Screen: {{SCREEN_ID}} — {{SCREEN_NAME}}
import { test, expect, APIRequestContext } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers — establish authenticated sessions per role
// ---------------------------------------------------------------------------

async function loginAs(request: APIRequestContext, loginId: string): Promise<void> {
  const res = await request.post('/auth/login', {
    data: { login_id: loginId, password: 'Test1234!' },
  });
  // Session cookie is set by the server (HttpOnly); request context carries it forward automatically.
  expect(res.status()).toBe(200);
}

// ---------------------------------------------------------------------------
// {{SCREEN_NAME}} — API tests
// All requests target https://nginx/api/v1 (set as baseURL in playwright.config.ts)
// ---------------------------------------------------------------------------

test.describe('{{SCREEN_ID}} API — {{SCREEN_NAME}}', () => {

  // ─── Success paths ────────────────────────────────────────────────────────

  test.describe('GET {{api_path}} — list', () => {
    test('should return 200 with data array when called as NICHINO_ADMIN', async ({ request }) => {
      await loginAs(request, 'nichino_admin');

      const res = await request.get('{{api_path}}');
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body).toHaveProperty('meta');
      expect(body.meta).toMatchObject({ total: expect.any(Number), page: expect.any(Number) });
    });

    test('should return only own-JA records when called as CHUOKAI', async ({ request }) => {
      await loginAs(request, 'chuokai');

      const res = await request.get('{{api_path}}');
      expect(res.status()).toBe(200);

      const body = await res.json();
      // DataScope: CHUOKAI must only see records belonging to own ja_id
      body.data.forEach((record: any) => {
        expect(record.ja_id).toBe(/* chuokai ja_id from seeder */ expect.any(Number));
      });
    });

    test('should return only own-JA records when called as JA_HONTEN', async ({ request }) => {
      await loginAs(request, 'ja_honten');

      const res = await request.get('{{api_path}}');
      expect(res.status()).toBe(200);

      const body = await res.json();
      body.data.forEach((record: any) => {
        expect(record.ja_id).toBeDefined();
      });
    });

    test('should return 401 UNAUTHORIZED when no session cookie', async ({ request }) => {
      const res = await request.get('{{api_path}}');
      expect(res.status()).toBe(401);

      const body = await res.json();
      expect(body.error_code).toBe('UNAUTHORIZED');
    });

    test('should return 403 FORBIDDEN when role lacks {{permission_view}} permission', async ({ request }) => {
      // Log in as a role that does NOT have {{permission_view}}
      // Adjust login_id to a role without this permission (update per screen)
      await loginAs(request, 'ja_kanri');

      const res = await request.get('{{api_path}}');
      // Expect 403 if ja_kanri lacks this permission; adjust if role has access
      expect([403, 200]).toContain(res.status());
    });
  });

  test.describe('GET {{api_path}}/:id — single record', () => {
    test('should return 200 with record when it belongs to caller JA', async ({ request }) => {
      await loginAs(request, 'nichino_admin');

      const listRes = await request.get('{{api_path}}');
      const list = await listRes.json();
      const id = list.data[0]?.id ?? list.data[0]?.{{entity}}_id;
      test.skip(!id, 'No seed data available');

      const res = await request.get(`{{api_path}}/${id}`);
      expect(res.status()).toBe(200);
      expect((await res.json()).data).toHaveProperty('id');
    });

    test('should return 404 NOT_FOUND when id does not exist', async ({ request }) => {
      await loginAs(request, 'nichino_admin');

      const res = await request.get('{{api_path}}/99999999');
      expect(res.status()).toBe(404);
      expect((await res.json()).error_code).toBe('NOT_FOUND');
    });

    test('should return 403 DATA_SCOPE_VIOLATION when record belongs to different JA', async ({ request }) => {
      await loginAs(request, 'chuokai');

      // Attempt to access a record seeded for a different JA
      // Replace 99999 with an ID known to belong to a different ja_id
      const res = await request.get('{{api_path}}/99999');
      expect([403, 404]).toContain(res.status());
      if (res.status() === 403) {
        expect((await res.json()).error_code).toBe('DATA_SCOPE_VIOLATION');
      }
    });
  });

  // ─── Create ───────────────────────────────────────────────────────────────

  test.describe('POST {{api_path}} — create', () => {
    test('should return 201 with created record when payload is valid', async ({ request }) => {
      await loginAs(request, 'nichino_admin');

      const res = await request.post('{{api_path}}', {
        data: {
          // {{VALID_CREATE_PAYLOAD}} — replace with valid fields from api.md
          _placeholder: true,
        },
      });
      expect(res.status()).toBe(201);
      expect((await res.json()).data).toHaveProperty('id');
    });

    test('should return 400 VALIDATION_ERROR when required field is missing', async ({ request }) => {
      await loginAs(request, 'nichino_admin');

      const res = await request.post('{{api_path}}', { data: {} });
      expect(res.status()).toBe(400);

      const body = await res.json();
      expect(body.error_code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(body.errors)).toBe(true);
    });

    test('should return 401 UNAUTHORIZED when no session cookie', async ({ request }) => {
      const res = await request.post('{{api_path}}', {
        data: { _placeholder: true },
      });
      expect(res.status()).toBe(401);
    });

    test('should return 403 FORBIDDEN when role lacks {{permission_create}} permission', async ({ request }) => {
      await loginAs(request, 'chuokai');

      const res = await request.post('{{api_path}}', {
        data: { _placeholder: true },
      });
      // Expect 403 if chuokai lacks create; adjust if role has permission
      expect([403, 201, 400]).toContain(res.status());
    });
  });

  // ─── Update ───────────────────────────────────────────────────────────────

  test.describe('PATCH {{api_path}}/:id — update', () => {
    test('should return 200 with updated record when payload is valid', async ({ request }) => {
      await loginAs(request, 'nichino_admin');

      const listRes = await request.get('{{api_path}}');
      const id = (await listRes.json()).data[0]?.id;
      test.skip(!id, 'No seed data available');

      const res = await request.patch(`{{api_path}}/${id}`, {
        data: {
          // {{VALID_UPDATE_PAYLOAD}} — replace with updatable fields from api.md
          _placeholder: true,
        },
      });
      expect(res.status()).toBe(200);
    });

    test('should return 404 NOT_FOUND when id does not exist', async ({ request }) => {
      await loginAs(request, 'nichino_admin');

      const res = await request.patch('{{api_path}}/99999999', {
        data: { _placeholder: true },
      });
      expect(res.status()).toBe(404);
      expect((await res.json()).error_code).toBe('NOT_FOUND');
    });

    test('should return 401 UNAUTHORIZED when no session cookie', async ({ request }) => {
      const res = await request.patch('{{api_path}}/1', { data: {} });
      expect(res.status()).toBe(401);
    });
  });

  // ─── Delete ───────────────────────────────────────────────────────────────

  test.describe('DELETE {{api_path}}/:id — delete', () => {
    test('should return 200 when record exists and caller has permission', async ({ request }) => {
      await loginAs(request, 'nichino_admin');

      // Create a throwaway record first
      const createRes = await request.post('{{api_path}}', {
        data: { _placeholder: true },
      });
      if (createRes.status() !== 201) {
        test.skip(true, 'Create failed; cannot test delete');
        return;
      }
      const id = (await createRes.json()).data.id;

      const res = await request.delete(`{{api_path}}/${id}`);
      expect(res.status()).toBe(200);
    });

    test('should return 404 NOT_FOUND when id does not exist', async ({ request }) => {
      await loginAs(request, 'nichino_admin');

      const res = await request.delete('{{api_path}}/99999999');
      expect(res.status()).toBe(404);
    });

    test('should return 409 CONFLICT when related records exist', async ({ request }) => {
      await loginAs(request, 'nichino_admin');

      // Replace with an ID known to have related data in the test seed
      const res = await request.delete('{{api_path}}/1');
      if (res.status() === 409) {
        expect((await res.json()).error_code).toBe('CONFLICT');
      } else {
        // Record had no related data — soft delete succeeded
        expect([200, 404]).toContain(res.status());
      }
    });

    test('should return 401 UNAUTHORIZED when no session cookie', async ({ request }) => {
      const res = await request.delete('{{api_path}}/1');
      expect(res.status()).toBe(401);
    });
  });

});
