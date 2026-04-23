import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';
import {
  ErrorCode,
  ErrorMessage,
} from '../constants/error-codes.constant';

type ValidationErrorDetail = { field: string; message: string };

/**
 * Catches every unhandled exception and converts it into the project's
 * standard JSON error body: `{ error_code, message, errors? }`.
 *
 * Priority:
 *  1. DomainException → uses its code + message verbatim.
 *  2. HttpException (from NestJS / ValidationPipe) → extracts `code`/`errors` from body
 *     or maps the HTTP status to a common ErrorCode.
 *  3. Anything else → 500 INTERNAL_SERVER_ERROR with a generic message.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  private static readonly STATUS_TO_CODE: Record<number, ErrorCode> = {
    [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
    [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
    [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
    [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
    [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
    [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
    [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_SERVER_ERROR,
  };

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ErrorCode.INTERNAL_SERVER_ERROR;
    let message: string = ErrorMessage.INTERNAL_SERVER_ERROR;
    let errors: ValidationErrorDetail[] | undefined;

    if (exception instanceof DomainException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        code =
          (obj.code as string) ??
          GlobalExceptionFilter.STATUS_TO_CODE[status] ??
          `HTTP_${status}`;
        message =
          (obj.message as string) ??
          ErrorMessage[code as ErrorCode] ??
          exception.message;
        errors = obj.errors as ValidationErrorDetail[] | undefined;
      } else {
        code =
          GlobalExceptionFilter.STATUS_TO_CODE[status] ?? `HTTP_${status}`;
        message = exception.message;
      }
    }

    const req = request as unknown as Record<string, unknown>;
    this.logger.error({
      event: 'api.error',
      statusCode: status,
      code,
      path: request.url,
      method: request.method,
      requestId: req.id,
      userId: req.user
        ? (req.user as Record<string, unknown>)?.accountId
        : undefined,
    });

    // Never leak internal details to the client on 500.
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      message = ErrorMessage.INTERNAL_SERVER_ERROR;
    }

    const body: Record<string, unknown> = { error_code: code, message };
    if (errors && errors.length > 0) {
      body.errors = errors;
    }

    response.status(status).json(body);
  }
}
