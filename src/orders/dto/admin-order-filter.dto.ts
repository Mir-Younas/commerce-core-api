import { OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ToTrim } from 'src/common/decorators/string-transform.decorator';

export enum AdminOrderSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  TOTAL_ASC = 'total_asc',
  TOTAL_DESC = 'total_desc',
}

export class AdminOrderFilterDto {
  @IsOptional()
  @IsString()
  @ToTrim()
  search?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @ToTrim()
  city?: string;

  @IsOptional()
  @IsEnum(AdminOrderSort)
  sortBy?: AdminOrderSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
