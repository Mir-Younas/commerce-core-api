import { Inject, Injectable, NestMiddleware } from '@nestjs/common';

import { Request, Response, NextFunction } from 'express';

import { Counter, Histogram, Registry } from '@prometheus-io/client';

import { PROMETHEUS_REGISTRY } from 'src/metrics/metrics.constants';

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
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

  use(request: Request, response: Response, next: NextFunction): void {
    const start = process.hrtime.bigint();

    response.once('finish', () => {
      const end = process.hrtime.bigint();

      const duration = Number(end - start) / 1_000_000_000;

      const method = request.method;

      const route = request.route?.path ?? request.path;

      const statusCode = response.statusCode.toString();

      const labels = {
        method,
        route,
        status_code: statusCode,
      };

      this.httpRequestsTotal.inc(labels);

      this.httpRequestDuration.observe(labels, duration);
    });

    next();
  }
}
