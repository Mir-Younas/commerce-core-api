import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth() {
    return {
      status: 'ok',
    };
  }

  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ready',
        database: 'up',
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not ready',
        database: 'down',
      });
    }
  }

  getHealthDetails() {
    const memory = process.memoryUsage();
    return {
      status: 'ok',
      uptime: `${Math.floor(process.uptime() / 60)} minutes`,
      memory: {
        rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
      },
    };
  }
}
