import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  DomainException,
  type ValidationErrorDetail,
} from '@/common/exceptions/domain.exception';
import {
  ErrorCode,
  ErrorMessage,
} from '@/common/constants/error-codes.constant';

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

  /**
   * Resolve status/code/message + optional errors/total from an
   * HttpException. Split out of `catch` to keep that method's cognitive
   * complexity low. Handles both object-response (project-thrown, carrying
   * `code` + localized `message`) and string-response (framework default)
   * exceptions, always preferring the project's localized ErrorMessage over
   * a framework English default.
   */
  private resolveHttpException(exception: HttpException): {
    status: number;
    code: string;
    message: string;
    errors?: ValidationErrorDetail[];
    total?: number;
  } {
    const status = exception.getStatus();
    const res = exception.getResponse();
    if (typeof res === 'object' && res !== null) {
      const obj = res as Record<string, unknown>;
      const projectCode = (obj.code as string) ?? (obj.error_code as string);
      const code =
        projectCode ??
        GlobalExceptionFilter.STATUS_TO_CODE[status] ??
        `HTTP_${status}`;
      const message = projectCode
        ? ((obj.message as string) ??
          ErrorMessage[code as ErrorCode] ??
          exception.message)
        : (ErrorMessage[code as ErrorCode] ??
          (obj.message as string) ??
          exception.message);
      return {
        status,
        code,
        message,
        errors: obj.errors as ValidationErrorDetail[] | undefined,
        total: obj.total as number | undefined,
      };
    }
    // String-response HttpException (framework default). Prefer the
    // localized message for a mapped status, else fall back.
    const code = GlobalExceptionFilter.STATUS_TO_CODE[status] ?? `HTTP_${status}`;
    return {
      status,
      code,
      message: ErrorMessage[code as ErrorCode] ?? exception.message,
    };
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ErrorCode.INTERNAL_SERVER_ERROR;
    let message: string = ErrorMessage.INTERNAL_SERVER_ERROR;
    let errors: ValidationErrorDetail[] | undefined;
    let total: number | undefined;

    if (exception instanceof DomainException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      errors = exception.errors;
      total = exception.total;
    } else if (exception instanceof HttpException) {
      ({ status, code, message, errors, total } =
        this.resolveHttpException(exception));
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
      // Surface the original exception stack so 500s aren't opaque.
      stack:
        status === HttpStatus.INTERNAL_SERVER_ERROR && exception instanceof Error
          ? exception.stack
          : undefined,
    });

    // Never leak internal details to the client on 500.
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      message = ErrorMessage.INTERNAL_SERVER_ERROR;
    }

    const body: Record<string, unknown> = {
      error_code: code,
      message,
      ...(errors && errors.length > 0 ? { errors } : {}),
      ...(total !== undefined ? { total } : {}),
    };

    response.status(status).json(body);
  }
}
