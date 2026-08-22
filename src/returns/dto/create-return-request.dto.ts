import { Type } from 'class-transformer';

import {
  ArrayMinSize,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';

import { CreateReturnItemDto } from './create-return-item.dto';

export class CreateReturnRequestDto {
  @IsUUID()
  orderId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({
    each: true,
  })
  @Type(() => CreateReturnItemDto)
  items!: CreateReturnItemDto[];
}