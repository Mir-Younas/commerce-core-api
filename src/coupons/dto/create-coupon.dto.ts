import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { CouponDiscountType } from '@prisma/client';

import { ToTrim } from 'src/common/decorators/string-transform.decorator';

export class CreateCouponDto {
  @IsString()
  @MaxLength(50)
  @ToTrim()
  code!: string;

  @IsEnum(CouponDiscountType)
  discountType!: CouponDiscountType;

  @IsInt()
  @Min(1)
  discountValue!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumOrderAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maximumDiscount?: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
