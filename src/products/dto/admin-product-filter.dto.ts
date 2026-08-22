import { IsEnum, IsOptional } from 'class-validator';
import { ProductStatus } from '@prisma/client';
import { ProductFilterDto } from '../../products/dto/product-filter.dto';

export class AdminProductFilterDto extends ProductFilterDto {
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}