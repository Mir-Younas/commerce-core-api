import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CouponDiscountType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import {
  CalculateDiscountInput,
  CouponCheckoutResult,
  ValidateCouponRulesInput,
  ValidateForCheckoutInput,
} from './coupons.type';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(body: CreateCouponDto) {
    const code = body.code.toUpperCase();

    await this.ensureCodeAvailable(code);

    this.validateCouponRules({
      discountType: body.discountType,
      discountValue: body.discountValue,
      maximumDiscount: body.maximumDiscount,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    });

    return this.prisma.coupon.create({
      data: {
        code,

        discountType: body.discountType,

        discountValue: body.discountValue,

        minimumOrderAmount: body.minimumOrderAmount,

        maximumDiscount: body.maximumDiscount,

        startDate: new Date(body.startDate),

        endDate: new Date(body.endDate),

        usageLimit: body.usageLimit,

        isActive: body.isActive,
      },

      select: this.getCouponSelect(),
    });
  }

  async findAll() {
    return this.prisma.coupon.findMany({
      select: this.getCouponSelect(),

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAvailable() {
    const now = new Date();

    const coupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,

        startDate: {
          lte: now,
        },

        endDate: {
          gte: now,
        },
      },

      select: {
        id: true,
        code: true,

        discountType: true,
        discountValue: true,

        minimumOrderAmount: true,
        maximumDiscount: true,

        startDate: true,
        endDate: true,

        usageLimit: true,
        usedCount: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

    return coupons.filter(
      (coupon) =>
        coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit,
    );
  }

  async findOne(couponId: string) {
    return this.findCouponById(couponId);
  }

  async update(couponId: string, body: UpdateCouponDto) {
    const coupon = await this.findCouponById(couponId);

    const code =
      body.code !== undefined ? body.code.toUpperCase() : coupon.code;

    if (code !== coupon.code) {
      await this.ensureCodeAvailable(code, coupon.id);
    }

    const discountType = body.discountType ?? coupon.discountType;

    const discountValue = body.discountValue ?? coupon.discountValue;

    const maximumDiscount =
      body.maximumDiscount !== undefined
        ? body.maximumDiscount
        : coupon.maximumDiscount;

    const startDate =
      body.startDate !== undefined
        ? new Date(body.startDate)
        : coupon.startDate;

    const endDate =
      body.endDate !== undefined ? new Date(body.endDate) : coupon.endDate;

    this.validateCouponRules({
      discountType,
      discountValue,
      maximumDiscount,
      startDate,
      endDate,
    });

    return this.prisma.coupon.update({
      where: {
        id: coupon.id,
      },

      data: {
        code,

        discountType: body.discountType,

        discountValue: body.discountValue,

        minimumOrderAmount: body.minimumOrderAmount,

        maximumDiscount: body.maximumDiscount,

        startDate: body.startDate ? new Date(body.startDate) : undefined,

        endDate: body.endDate ? new Date(body.endDate) : undefined,

        usageLimit: body.usageLimit,

        isActive: body.isActive,
      },

      select: this.getCouponSelect(),
    });
  }

  async remove(couponId: string) {
    const coupon = await this.findCouponById(couponId);

    if (coupon.usedCount > 0) {
      throw new BadRequestException('Used coupon cannot be deleted');
    }

    return this.prisma.coupon.delete({
      where: {
        id: coupon.id,
      },

      select: {
        id: true,
      },
    });
  }

  async validateForCheckout(
    params: ValidateForCheckoutInput,
  ): Promise<CouponCheckoutResult> {
    const coupon = await this.prisma.coupon.findUnique({
      where: {
        code: params.code.trim().toUpperCase(),
      },

      select: {
        id: true,
        code: true,

        discountType: true,
        discountValue: true,

        minimumOrderAmount: true,
        maximumDiscount: true,

        startDate: true,
        endDate: true,

        usageLimit: true,
        usedCount: true,

        isActive: true,
      },
    });

    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    const now = new Date();

    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is not active');
    }

    if (now < coupon.startDate) {
      throw new BadRequestException('Coupon is not active yet');
    }

    if (now > coupon.endDate) {
      throw new BadRequestException('Coupon has expired');
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit has been reached');
    }

    if (
      coupon.minimumOrderAmount !== null &&
      params.subtotal < coupon.minimumOrderAmount
    ) {
      throw new BadRequestException(
        `Minimum order amount for this coupon is ${coupon.minimumOrderAmount}`,
      );
    }

    const { discountType, discountValue, maximumDiscount } = coupon;

    const { subtotal } = params;

    const discountAmount = this.calculateDiscount({
      discountType,
      discountValue,
      maximumDiscount,
      subtotal,
    });

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountAmount,
    };
  }

  private calculateDiscount(params: CalculateDiscountInput): number {
    if (params.discountType === CouponDiscountType.FIXED) {
      return Math.min(params.discountValue, params.subtotal);
    }

    let discountAmount = Math.floor(
      (params.subtotal * params.discountValue) / 100,
    );

    if (params.maximumDiscount !== null) {
      discountAmount = Math.min(discountAmount, params.maximumDiscount);
    }

    return discountAmount;
  }

  private validateCouponRules(coupon: ValidateCouponRulesInput): void {
    if (coupon.startDate >= coupon.endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (
      coupon.discountType === CouponDiscountType.PERCENTAGE &&
      coupon.discountValue > 100
    ) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }

    if (
      coupon.discountType === CouponDiscountType.FIXED &&
      coupon.maximumDiscount != null
    ) {
      throw new BadRequestException(
        'Maximum discount is only allowed for percentage coupons',
      );
    }
  }

  private async ensureCodeAvailable(code: string, excludeCouponId?: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code,

        ...(excludeCouponId
          ? {
              NOT: {
                id: excludeCouponId,
              },
            }
          : {}),
      },

      select: {
        id: true,
      },
    });

    if (coupon) {
      throw new ConflictException('Coupon code already exists');
    }
  }

  private async findCouponById(couponId: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: {
        id: couponId,
      },

      select: this.getCouponSelect(),
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return coupon;
  }

  private getCouponSelect() {
    return {
      id: true,
      code: true,

      discountType: true,
      discountValue: true,

      minimumOrderAmount: true,
      maximumDiscount: true,

      startDate: true,
      endDate: true,

      usageLimit: true,
      usedCount: true,

      isActive: true,

      createdAt: true,
      updatedAt: true,
    };
  }
}
