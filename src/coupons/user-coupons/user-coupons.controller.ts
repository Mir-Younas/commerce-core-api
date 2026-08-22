import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CouponsService } from '../coupons.service';

@Controller('user/coupons')
@UseGuards(JwtAuthGuard)
export class UserCouponsController {
  constructor(
    private readonly couponsService: CouponsService,
  ) {}

  @Get()
  async findAvailable() {
    const coupons =
      await this.couponsService.findAvailable();

    return {
      message:
        'Available coupons fetched successfully',
      coupons,
    };
  }
}