import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminAuditInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<{
      statusCode?: number;
    }>();

    const method = (request.method || '').toUpperCase();
    const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
    const actorRole = request.user?.role;
    const isAdminAction = actorRole === 'ADMIN' && isMutation;

    if (!isAdminAction) {
      return next.handle();
    }

    const requestId = request.headers['x-request-id'] || 'unknown';
    const actorId = request.user?.id || 'unknown';
    const route = request.originalUrl || request.url || 'unknown';
    const targetParams = request.params || {};
    const bodyKeys = Object.keys((request.body as Record<string, unknown>) || {});
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        this.logger.log(
          [
            '[ADMIN_AUDIT]',
            `requestId=${String(requestId)}`,
            `actorId=${actorId}`,
            `method=${method}`,
            `route=${route}`,
            `status=${response.statusCode ?? 200}`,
            `params=${JSON.stringify(targetParams)}`,
            `bodyKeys=${JSON.stringify(bodyKeys)}`,
            `durationMs=${durationMs}`,
            'outcome=success',
          ].join(' '),
        );
      }),
      catchError((error: unknown) => {
        const durationMs = Date.now() - startedAt;
        const statusCode =
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          typeof (error as { status?: unknown }).status === 'number'
            ? (error as { status: number }).status
            : 500;

        this.logger.warn(
          [
            '[ADMIN_AUDIT]',
            `requestId=${String(requestId)}`,
            `actorId=${actorId}`,
            `method=${method}`,
            `route=${route}`,
            `status=${statusCode}`,
            `params=${JSON.stringify(targetParams)}`,
            `bodyKeys=${JSON.stringify(bodyKeys)}`,
            `durationMs=${durationMs}`,
            'outcome=failure',
          ].join(' '),
        );

        return throwError(() => error);
      }),
    );
  }
}
