import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Role } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

import { CouponsService } from './coupons.service';

@Controller('admin/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateCouponDto) {
    const coupon = await this.couponsService.create(body);

    return {
      message: 'Coupon created successfully',
      coupon,
    };
  }

  @Get()
  async findAll() {
    const coupons = await this.couponsService.findAll();

    return {
      message: 'Coupons fetched successfully',
      coupons,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    const coupon = await this.couponsService.findOne(id);

    return {
      message: 'Coupon fetched successfully',
      coupon,
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe)
    id: string,
    @Body() body: UpdateCouponDto,
  ) {
    const coupon = await this.couponsService.update(id, body);

    return {
      message: 'Coupon updated successfully',
      coupon,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    await this.couponsService.remove(id);

    return {
      message: 'Coupon deleted successfully',
    };
  }
}
