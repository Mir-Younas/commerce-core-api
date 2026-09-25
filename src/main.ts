import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpMetricsMiddleware } from './metrics/http-metrics.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const httpMetricsMiddleware = app.get(HttpMetricsMiddleware);

  app.use(httpMetricsMiddleware.use.bind(httpMetricsMiddleware));

  app.use(cookieParser());

  app.enableCors({
    origin: configService.getOrThrow<string>('CLIENT_URL'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT') ?? 3000;

  await app.listen(port);

  console.log(`App is running on port ${port}`);
}

void bootstrap();
