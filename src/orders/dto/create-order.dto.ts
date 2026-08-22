// import { PaymentMethod, PaymentProvider } from '@prisma/client';
// import {
//   IsEnum,
//   IsOptional,
//   IsString,
//   MaxLength,
//   MinLength,
//   ValidateIf,
// } from 'class-validator';
// import { ToTrim } from 'src/common/decorators/to-trim.decorator';

// export class CreateOrderDto {
//   @IsString()
//   @MinLength(2)
//   @MaxLength(100)
//   @ToTrim()
//   fullName!: string;

//   @IsString()
//   @MinLength(7)
//   @MaxLength(20)
//   @ToTrim()
//   phone!: string;

//   @IsString()
//   @MinLength(5)
//   @MaxLength(255)
//   @ToTrim()
//   address!: string;

//   @IsString()
//   @MinLength(2)
//   @MaxLength(100)
//   @ToTrim()
//   city!: string;

//   @IsOptional()
//   @IsString()
//   @MaxLength(500)
//   @ToTrim()
//   note?: string;

//   @IsEnum(PaymentMethod)
//   paymentMethod!: PaymentMethod;

//   @ValidateIf((body) => body.paymentMethod === PaymentMethod.ONLINE)
//   @IsEnum(PaymentProvider)
//   paymentProvider?: PaymentProvider;
// }

import { PaymentMethod, PaymentProvider } from '@prisma/client';

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

import { ToTrim } from 'src/common/decorators/to-trim.decorator';

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

  @ValidateIf((body) => body.paymentMethod === PaymentMethod.ONLINE)
  @IsEnum(PaymentProvider)
  paymentProvider?: PaymentProvider;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ToTrim()
  couponCode?: string;
}
