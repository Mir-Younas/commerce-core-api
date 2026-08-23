import { Role, UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ToBoolean } from '../../common/decorators/to-boolean.decorator';
import { ToTrim } from 'src/common/decorators/string-transform.decorator';

export enum AdminUserSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
}

export class AdminUserFilterDto {
  @IsOptional()
  @IsString()
  @ToTrim()
  search?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isEmailVerified?: boolean;

  @IsOptional()
  @IsEnum(AdminUserSort)
  sortBy?: AdminUserSort;

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
