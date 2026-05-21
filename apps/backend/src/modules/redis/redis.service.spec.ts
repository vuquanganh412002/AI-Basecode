// RedisService unit specs — uses ioredis-mock (already a project dev
// dep, used by createIntegrationTestApp) so we exercise real ioredis
// semantics without a network connection.

import RedisMock from 'ioredis-mock';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let client: any;
  let service: RedisService;

  beforeEach(() => {
    client = new (RedisMock as any)();
    service = new RedisService(client);
  });

  afterEach(async () => {
    await client.quit().catch(() => undefined);
  });

  it('should expose the raw client via the `raw` getter', () => {
    expect(service.raw).toBe(client);
  });

  describe('get / setEx', () => {
    it('should round-trip a value through setEx + get', async () => {
      await service.setEx('k1', 60, 'hello');
      expect(await service.get('k1')).toBe('hello');
    });

    it('should return null for an unknown key', async () => {
      expect(await service.get('missing')).toBeNull();
    });

    it('should set the TTL passed to setEx (verified via TTL command)', async () => {
      await service.setEx('k2', 120, 'v');
      const ttl = await client.ttl('k2');
      // ioredis-mock returns the seconds remaining; should be close to 120.
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(120);
    });
  });

  describe('expire', () => {
    it('should attach a TTL to an existing key', async () => {
      await client.set('k3', 'v');
      await service.expire('k3', 60);
      const ttl = await client.ttl('k3');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });
  });

  describe('del', () => {
    it('should return 0 immediately when called with NO keys (avoid ioredis "wrong number of args")', async () => {
      const result = await service.del();
      expect(result).toBe(0);
    });

    it('should DEL one key and return the count', async () => {
      await client.set('k4', 'v');
      const removed = await service.del('k4');
      expect(removed).toBe(1);
      expect(await client.get('k4')).toBeNull();
    });

    it('should DEL multiple keys in one round-trip', async () => {
      await client.set('a', '1');
      await client.set('b', '2');
      await client.set('c', '3');

      const removed = await service.del('a', 'b', 'c', 'never-existed');

      expect(removed).toBe(3);
    });
  });

  describe('sadd / srem / smembers', () => {
    it('should add then list members from a Set', async () => {
      await service.sadd('s1', 'x', 'y');
      const members = (await service.smembers('s1')).sort();
      expect(members).toEqual(['x', 'y']);
    });

    it('should remove members via srem', async () => {
      await service.sadd('s2', 'a', 'b', 'c');
      const removed = await service.srem('s2', 'b');
      expect(removed).toBe(1);
      const members = (await service.smembers('s2')).sort();
      expect(members).toEqual(['a', 'c']);
    });

    it('should return [] from smembers for an unknown Set', async () => {
      expect(await service.smembers('nope')).toEqual([]);
    });
  });

  describe('ping', () => {
    it('should return true when ioredis returns PONG', async () => {
      expect(await service.ping()).toBe(true);
    });

    it('should return false and log the error when ioredis ping rejects', async () => {
      client.ping = jest.fn().mockRejectedValue(new Error('connection refused'));
      const logSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);

      expect(await service.ping()).toBe(false);
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'redis.ping.failed' }),
      );
    });

    it('should return false when ping resolves to something other than PONG', async () => {
      client.ping = jest.fn().mockResolvedValue('WAT');
      expect(await service.ping()).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should call client.quit() so the connection drains gracefully', async () => {
      const quitSpy = jest.spyOn(client, 'quit');
      await service.onModuleDestroy();
      expect(quitSpy).toHaveBeenCalled();
    });

    it('should swallow errors from quit() so Nest shutdown does not throw', async () => {
      client.quit = jest.fn().mockRejectedValue(new Error('boom'));
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });
});
