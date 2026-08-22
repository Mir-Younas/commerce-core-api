import { CouponDiscountType } from '@prisma/client';

export type CouponCheckoutResult = {
  couponId: string;
  code: string;
  discountAmount: number;
};

export type ValidateForCheckoutInput = {
  code: string;
  subtotal: number;
};

export type CalculateDiscountInput = {
  discountType: CouponDiscountType;
  discountValue: number;
  maximumDiscount: number | null;
  subtotal: number;
};

export type ValidateCouponRulesInput = {
  discountType: CouponDiscountType;
  discountValue: number;
  maximumDiscount?: number | null;
  startDate: Date;
  endDate: Date;
};
