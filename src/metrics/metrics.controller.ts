import { Controller, Get, Header, Inject } from '@nestjs/common';
import { Registry } from '@prometheus-io/client';
import { PROMETHEUS_REGISTRY } from './metrics.constants';

@Controller('metrics')
export class MetricsController {
  constructor(
    @Inject(PROMETHEUS_REGISTRY)
    private readonly register: Registry,
  ) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }
}
