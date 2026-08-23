import { PaymentMethod, PaymentProvider } from '@prisma/client';

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

import { ToTrim } from 'src/common/decorators/string-transform.decorator';

export class CreateOrderDto {
  @IsUUID()
  addressId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ToTrim()
  note?: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ValidateIf(
    (body: CreateOrderDto) => body.paymentMethod === PaymentMethod.ONLINE,
  )
  @IsEnum(PaymentProvider)
  paymentProvider?: PaymentProvider;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ToTrim()
  couponCode?: string;
}
