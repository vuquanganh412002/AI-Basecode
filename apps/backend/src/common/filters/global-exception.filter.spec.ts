// Drives src/common/filters/global-exception.filter.ts.
//
// Regression (backend review finding #13): the structured `api.error` log
// read `req.user.accountId` (camelCase), but SessionAuthGuard attaches the
// SessionPayload with `account_id` (snake_case) — so `userId` was always
// `undefined` in every CloudWatch error log for authenticated requests,
// breaking the error-to-user correlation monitoring.md mandates for
// incident investigation.

import { HttpStatus, type ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { NotFoundException } from '@/common/exceptions/common.exceptions';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let loggerErrorSpy: jest.SpyInstance;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  function buildHost(user?: unknown): ArgumentsHost {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const request = {
      url: '/api/v1/tanka/1',
      method: 'GET',
      id: 'req-1',
      user,
    };
    return {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
  }

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    loggerErrorSpy = jest
      .spyOn((filter as unknown as { logger: { error: () => void } }).logger, 'error')
      .mockImplementation(() => undefined);
  });

  it('should log userId from req.user.account_id (SessionPayload snake_case field)', () => {
    const host = buildHost({ account_id: 42, role_code: 'CHUOKAI' });

    filter.catch(new NotFoundException('テスト'), host);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42 }),
    );
  });

  it('should log userId as undefined when no session is attached (unauthenticated request)', () => {
    const host = buildHost(undefined);

    filter.catch(new NotFoundException('テスト'), host);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userId: undefined }),
    );
  });

  it('should still respond with the standard error body shape', () => {
    const host = buildHost({ account_id: 1 });

    filter.catch(new NotFoundException('テスト'), host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error_code: 'NOT_FOUND' }),
    );
  });
});
