// SessionService unit specs — Redis CRUD + per-account index.
// Plain `new` instantiation with a mocked RedisService (no ioredis).

import { ConfigService } from '@nestjs/config';
import { SessionService, type SessionPayload } from './session.service';

function buildConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function buildBasePayload(): Omit<SessionPayload, 'created_at' | 'last_activity_at'> {
  return {
    account_id: 42,
    login_id: 'admin01',
    role_id: 1,
    role_code: 'NICHINO_ADMIN',
    ja_id: null,
    kanri_shiten_id: null,
    permissions: ['ja.view'],
  };
}

describe('SessionService', () => {
  let redis: any;
  let service: SessionService;

  beforeEach(() => {
    redis = {
      get: jest.fn(),
      setEx: jest.fn().mockResolvedValue(undefined),
      expire: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(1),
      sadd: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      smembers: jest.fn().mockResolvedValue([]),
    };
    service = new SessionService(redis, buildConfig({ 'session.ttlSeconds': 3600 }));
  });

  describe('constructor', () => {
    it('should read TTL from config (session.ttlSeconds)', async () => {
      await service.create(buildBasePayload());
      expect(redis.setEx).toHaveBeenCalledWith(
        expect.any(String),
        3600,
        expect.any(String),
      );
    });

    it('should default TTL to 24h (86400s) when config is missing the key', async () => {
      const svc = new SessionService(redis, buildConfig({}));
      await svc.create(buildBasePayload());
      expect(redis.setEx).toHaveBeenCalledWith(
        expect.any(String),
        86400,
        expect.any(String),
      );
    });
  });

  describe('create', () => {
    it('should return a UUID-v4-shaped session ID', async () => {
      const sid = await service.create(buildBasePayload());
      expect(sid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should write the session key "session:{sid}" with the TTL + payload JSON', async () => {
      const sid = await service.create(buildBasePayload());

      expect(redis.setEx).toHaveBeenCalledWith(
        `session:${sid}`,
        3600,
        expect.any(String),
      );
      const body = JSON.parse(redis.setEx.mock.calls[0][2]);
      expect(body).toMatchObject({
        account_id: 42,
        login_id: 'admin01',
        role_code: 'NICHINO_ADMIN',
      });
      expect(body.created_at).toBeDefined();
      expect(body.last_activity_at).toBe(body.created_at);
    });

    it('should add the new session ID to the account index Set', async () => {
      const sid = await service.create(buildBasePayload());

      expect(redis.sadd).toHaveBeenCalledWith('account_sessions:42', sid);
      expect(redis.expire).toHaveBeenCalledWith('account_sessions:42', 3600);
    });
  });

  describe('get', () => {
    it('should return the parsed payload when the session exists', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ account_id: 7, login_id: 'x' }),
      );
      const payload = await service.get('sid');

      expect(payload).toMatchObject({ account_id: 7, login_id: 'x' });
      expect(redis.get).toHaveBeenCalledWith('session:sid');
    });

    it('should return null when Redis has no entry', async () => {
      redis.get.mockResolvedValue(null);
      expect(await service.get('sid')).toBeNull();
    });

    it('should destroy the key and return null when the payload is corrupt JSON', async () => {
      redis.get.mockResolvedValueOnce('not-valid-json{');

      const result = await service.get('sid');

      expect(result).toBeNull();
      // destroy() runs internally — verified via the del() call on the
      // session key. Note `destroy()` calls `get()` again to fetch the
      // payload; the second .get returns null because we used Once.
      expect(redis.del).toHaveBeenCalledWith('session:sid');
    });

    it('should swallow downstream errors from destroy() when payload is corrupt', async () => {
      redis.get.mockResolvedValueOnce('not-valid-json{');
      redis.del.mockRejectedValueOnce(new Error('redis down'));
      // Should still resolve to null without throwing.
      await expect(service.get('sid')).resolves.toBeNull();
    });
  });

  describe('touch (sliding expiration)', () => {
    it('should refresh the TTL and stamp last_activity_at when the session exists', async () => {
      const stored = {
        ...buildBasePayload(),
        created_at: '2026-01-01T00:00:00.000Z',
        last_activity_at: '2026-01-01T00:00:00.000Z',
      };
      redis.get.mockResolvedValue(JSON.stringify(stored));

      const result = await service.touch('sid');

      expect(result).not.toBeNull();
      // last_activity_at gets re-stamped (different from created_at).
      expect(result?.last_activity_at).not.toBe('2026-01-01T00:00:00.000Z');
      // Session key re-written with same TTL.
      expect(redis.setEx).toHaveBeenCalledWith(
        'session:sid',
        3600,
        expect.any(String),
      );
      // Account index TTL extended.
      expect(redis.expire).toHaveBeenCalledWith(
        `account_sessions:${stored.account_id}`,
        3600,
      );
    });

    it('should return null and skip refresh when the session is gone', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.touch('sid');

      expect(result).toBeNull();
      expect(redis.setEx).not.toHaveBeenCalled();
      expect(redis.expire).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should SREM from the account index AND DEL the session key when payload exists', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ account_id: 99 }),
      );

      await service.destroy('sid');

      expect(redis.srem).toHaveBeenCalledWith('account_sessions:99', 'sid');
      expect(redis.del).toHaveBeenCalledWith('session:sid');
    });

    it('should still DEL the session key even when payload is already gone (best-effort)', async () => {
      redis.get.mockResolvedValue(null);

      await service.destroy('sid');

      expect(redis.srem).not.toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith('session:sid');
    });
  });

  describe('destroyAllForAccount', () => {
    it('should return 0 and DEL the index key when no sessions are tracked', async () => {
      redis.smembers.mockResolvedValue([]);

      const count = await service.destroyAllForAccount(42);

      expect(count).toBe(0);
      expect(redis.del).toHaveBeenCalledWith('account_sessions:42');
    });

    it('should swallow DEL errors on the empty-index path', async () => {
      redis.smembers.mockResolvedValue([]);
      redis.del.mockRejectedValueOnce(new Error('boom'));
      await expect(service.destroyAllForAccount(42)).resolves.toBe(0);
    });

    it('should DEL every session key + the index in one call and return the count', async () => {
      redis.smembers.mockResolvedValue(['sid-a', 'sid-b', 'sid-c']);

      const count = await service.destroyAllForAccount(7);

      expect(count).toBe(3);
      expect(redis.del).toHaveBeenCalledWith(
        'session:sid-a',
        'session:sid-b',
        'session:sid-c',
        'account_sessions:7',
      );
    });
  });
});
