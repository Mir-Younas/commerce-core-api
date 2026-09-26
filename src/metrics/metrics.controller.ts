import { Controller, Get, Header, Inject, UseGuards } from '@nestjs/common';
import { Registry } from '@prometheus-io/client';
import { PROMETHEUS_REGISTRY } from './metrics.constants';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class MetricsController {
  constructor(
    @Inject(PROMETHEUS_REGISTRY)
    private readonly prometheusRegistry: Registry,
  ) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return this.prometheusRegistry.metrics();
  }
}
