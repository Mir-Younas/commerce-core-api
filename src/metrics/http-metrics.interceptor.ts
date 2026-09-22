import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import { Counter, Histogram, Registry } from '@prometheus-io/client';

import { PROMETHEUS_REGISTRY } from './metrics.constants';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor<
  unknown,
  unknown
> {
  private readonly httpRequestsTotal: Counter<
    'method' | 'route' | 'status_code'
  >;

  private readonly httpRequestDuration: Histogram<
    'method' | 'route' | 'status_code'
  >;

  constructor(
    @Inject(PROMETHEUS_REGISTRY)
    private readonly registry: Registry,
  ) {
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const httpContext = context.switchToHttp();

    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => {
          this.recordMetrics(request, start, response.statusCode);
        },

        error: (error: unknown) => {
          const statusCode =
            error instanceof HttpException ? error.getStatus() : 500;

          this.recordMetrics(request, start, statusCode);
        },
      }),
    );
  }

  private recordMetrics(
    request: Request,
    start: bigint,
    statusCode: number,
  ): void {
    const end = process.hrtime.bigint();

    const duration = Number(end - start) / 1_000_000_000;

    const method = request.method;
    const route = request.route?.path ?? request.path;

    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
    };

    this.httpRequestsTotal.inc(labels);

    this.httpRequestDuration.observe(labels, duration);
  }
}
