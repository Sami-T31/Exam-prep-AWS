import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '../middleware/request-id.middleware';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId =
      (request.headers[REQUEST_ID_HEADER.toLowerCase()] as string) ||
      'unknown';

    let statusCode: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;
        message = (body.message as string | string[]) || exception.message;
        error = (body.error as string) || exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      error = 'Internal Server Error';

      this.logger.error(
        `Unhandled exception [${requestId}]: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const responseBody = {
      statusCode,
      message,
      error,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(responseBody);
  }
}
