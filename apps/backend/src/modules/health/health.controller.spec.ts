// HealthController unit specs — ECS/ALB liveness + readiness probes.
//
// Plain `new` instantiation since the controller has only a DataSource
// dependency and no Nest lifecycle (guards / pipes / interceptors) to
// exercise.

import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: any;

  beforeEach(() => {
    dataSource = { query: jest.fn() };
    controller = new HealthController(dataSource as never);
  });

  describe('GET /health (liveness)', () => {
    it('should return status=ok with an ISO-8601 timestamp', () => {
      const result = controller.check();

      expect(result.status).toBe('ok');
      // Timestamp parses back to a real Date.
      expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
    });

    it('should NOT call the DataSource (cheap liveness probe)', () => {
      controller.check();
      expect(dataSource.query).not.toHaveBeenCalled();
    });
  });

  describe('GET /health/ready (readiness)', () => {
    it('should return status=ok + db=connected when SELECT 1 succeeds', async () => {
      dataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.readiness();

      expect(result).toEqual({ status: 'ok', db: 'connected' });
      expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should throw ServiceUnavailableException with db=disconnected payload when DB query fails', async () => {
      dataSource.query.mockRejectedValue(new Error('connection refused'));

      await expect(controller.readiness()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );

      try {
        await controller.readiness();
        fail('expected throw');
      } catch (err: any) {
        expect(err.getResponse()).toEqual({
          status: 'error',
          db: 'disconnected',
        });
      }
    });
  });
});
