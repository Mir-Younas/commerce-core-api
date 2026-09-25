import { Module } from '@nestjs/common';

import { MetricsController } from './metrics.controller';
import { prometheusRegistryProvider } from './metrics.providers';
import { HttpMetricsMiddleware } from './http-metrics.middleware';

@Module({
  controllers: [MetricsController],
  providers: [prometheusRegistryProvider, HttpMetricsMiddleware],
})
export class MetricsModule {}
