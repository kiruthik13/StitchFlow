import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorCode = 'ERR_INTERNAL_SERVER';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string | string[]) || exception.message;
        errorCode = (obj.errorCode as string) || this.statusToErrorCode(status);
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error on ${request.method} ${request.url}: ${exception.message}`);
    }

    response.status(status).json({
      statusCode: status,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private statusToErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'ERR_VALIDATION_FAILED';
      case 401:
        return 'ERR_UNAUTHORIZED';
      case 403:
        return 'ERR_FORBIDDEN';
      case 404:
        return 'ERR_NOT_FOUND';
      case 409:
        return 'ERR_CONFLICT';
      case 429:
        return 'ERR_RATE_LIMITED';
      default:
        return 'ERR_INTERNAL_SERVER';
    }
  }
}
