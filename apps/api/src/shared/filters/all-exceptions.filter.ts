import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

import { REQUEST_ID_HEADER } from '../../operations/constants/operations.constants';
import { MetricsService } from '../../operations/metrics/metrics.service';
import { RequestContextService } from '../../operations/request-context/request-context.service';
import { RequestWithId } from '../../operations/request-context/request-id.util';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  code?: string;
  requestId?: string;
  timestamp: string;
  path: string;
}

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    private readonly requestContextService: RequestContextService,
    private readonly metricsService: MetricsService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    const { statusCode, message, code } = this.resolveException(exception);
    const requestId = request.requestId ?? this.requestContextService.getRequestId();

    if (requestId) {
      response.setHeader(REQUEST_ID_HEADER, requestId);
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      code,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.metricsService.recordRequest(false);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        JSON.stringify({
          requestId,
          method: request.method,
          path: request.url,
          statusCode,
          message,
        }),
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        JSON.stringify({
          requestId,
          method: request.method,
          path: request.url,
          statusCode,
          message,
        }),
      );
    }

    response.status(statusCode).json(errorResponse);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string | string[];
    code?: string;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return { statusCode, message: exceptionResponse };
      }

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseBody = exceptionResponse as Record<string, unknown>;
        const message = responseBody.message ?? exception.message;
        const code = typeof responseBody.code === 'string' ? responseBody.code : undefined;

        return {
          statusCode,
          message: Array.isArray(message) ? message : String(message),
          code,
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}
