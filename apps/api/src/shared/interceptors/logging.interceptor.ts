import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { Observable, tap } from 'rxjs';

import { MetricsService } from '../../operations/metrics/metrics.service';
import { RequestContextService } from '../../operations/request-context/request-context.service';
import { RequestWithId } from '../../operations/request-context/request-id.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(
    private readonly requestContextService: RequestContextService,
    private readonly metricsService: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const { method, url } = request;
    const startedAt = Date.now();
    const requestId = request.requestId ?? this.requestContextService.getRequestId();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse<Response>();
        const duration = Date.now() - startedAt;

        this.metricsService.recordRequest(true);
        this.logger.log(
          JSON.stringify({
            requestId,
            method,
            url,
            statusCode: response.statusCode,
            durationMs: duration,
          }),
        );
      }),
    );
  }
}
