import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { Counter, Gauge, Histogram } from '@prometheus-io/client';
import type { Registry } from '@prometheus-io/client';

import { PROMETHEUS_REGISTRY } from './metrics.constants';

type MetricLabels = {
  method: string;
  route: string;
  status_code: string;
};

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  private readonly httpRequestsTotal: Counter<
    'method' | 'route' | 'status_code'
  >;

  private readonly httpRequestDuration: Histogram<
    'method' | 'route' | 'status_code'
  >;

  private readonly httpRequestHeapDelta: Gauge<
    'method' | 'route' | 'status_code'
  >;

  private readonly httpRequestCpuTime: Histogram<
    'method' | 'route' | 'status_code'
  >;

  constructor(
    @Inject(PROMETHEUS_REGISTRY)
    private readonly prometheusRegistry: Registry,
  ) {
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.prometheusRegistry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.prometheusRegistry],
    });

    this.httpRequestHeapDelta = new Gauge({
      name: 'http_request_heap_delta_bytes',
      help: 'Change in V8 heap memory during an HTTP request in bytes',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.prometheusRegistry],
    });

    this.httpRequestCpuTime = new Histogram({
      name: 'http_request_cpu_time_seconds',
      help: 'CPU time used during HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.prometheusRegistry],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    });
  }

  use(request: Request, response: Response, next: NextFunction): void {
    if (request.path === '/metrics') {
      next();
      return;
    }
    const startTime = process.hrtime.bigint();
    const heapBefore = process.memoryUsage().heapUsed;
    const cpuBefore = process.cpuUsage();

    response.once('finish', () => {
      const endTime = process.hrtime.bigint();

      const durationSeconds = Number(endTime - startTime) / 1_000_000_000;

      const heapAfter = process.memoryUsage().heapUsed;
      const heapDelta = heapAfter - heapBefore;

      const cpuDelta = process.cpuUsage(cpuBefore);

      const cpuTimeSeconds = (cpuDelta.user + cpuDelta.system) / 1_000_000;

      const labels: MetricLabels = {
        method: request.method,
        route: this.getRoutePath(request),
        status_code: response.statusCode.toString(),
      };

      this.httpRequestsTotal.inc(labels);

      this.httpRequestDuration.observe(labels, durationSeconds);

      this.httpRequestHeapDelta.set(labels, heapDelta);

      this.httpRequestCpuTime.observe(labels, cpuTimeSeconds);
    });

    next();
  }

  private getRoutePath(request: Request): string {
    const route: unknown = request.route;

    if (
      typeof route === 'object' &&
      route !== null &&
      'path' in route &&
      typeof route.path === 'string'
    ) {
      return route.path;
    }

    return request.path;
  }
}
