import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { ReturnStatus } from '@prisma/client';

import { ToTrim } from 'src/common/decorators/to-trim.decorator';

export class UpdateReturnStatusDto {
  @IsEnum(ReturnStatus)
  status!: ReturnStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ToTrim()
  adminNote?: string;
}