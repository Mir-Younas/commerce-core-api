import { ProductStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { ToBoolean } from 'src/common/decorators/to-boolean.decorator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  price!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  discountPrice?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock!: number;

  @IsString()
  @IsNotEmpty()
  sku!: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isFeatured?: boolean;

  @IsUUID()
  categoryId!: string;
}
