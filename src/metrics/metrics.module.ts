// import { Module } from '@nestjs/common';
// import { APP_INTERCEPTOR } from '@nestjs/core';
// import {
//   Registry,
//   collectDefaultMetrics,
// } from '@prometheus-io/client';

// import { MetricsController } from './metrics.controller';
// import { HttpMetricsInterceptor } from './http-metrics.interceptor';
// import { PROMETHEUS_REGISTRY } from './metrics.constants';
// import { MetricsTestController } from './metrics-test.controller';

// @Module({
//   controllers: [MetricsController, MetricsTestController],

//   providers: [
//     {
//       provide: PROMETHEUS_REGISTRY,
//       useFactory: () => {
//         const registry = new Registry();

//         collectDefaultMetrics({
//           register: registry,
//         });

//         return registry;
//       },
//     },
//     // {
//     //   provide: APP_INTERCEPTOR,
//     //   useClass: HttpMetricsInterceptor,
//     // },
//   ],
// })
// export class MetricsModule {}

import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';

import { Registry, collectDefaultMetrics } from '@prometheus-io/client';

import { MetricsController } from './metrics.controller';
import { MetricsTestController } from './metrics-test.controller';
import { HttpMetricsMiddleware } from './src/metrics/http-metrics.middleware';
import { PROMETHEUS_REGISTRY } from './metrics.constants';

@Module({
  controllers: [MetricsController, MetricsTestController],

  providers: [
    {
      provide: PROMETHEUS_REGISTRY,
      useFactory: () => {
        const registry = new Registry();

        collectDefaultMetrics({
          register: registry,
        });

        return registry;
      },
    },
  ],
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpMetricsMiddleware).forRoutes({
      path: '{*splat}',
      method: RequestMethod.ALL,
    });
  }
}
