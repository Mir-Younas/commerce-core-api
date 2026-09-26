import {
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';

import { MetricsController } from './metrics.controller';
import { prometheusRegistryProvider } from './metrics.providers';
import { HttpMetricsMiddleware } from './http-metrics.middleware';

@Module({
  controllers: [MetricsController],
  providers: [
    prometheusRegistryProvider,
  ],
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HttpMetricsMiddleware)
      .forRoutes('*');
  }
}