import { IsOptional, IsString, MinLength } from 'class-validator';
import { ToTrim } from 'src/common/decorators/string-transform.decorator';

export class UpdateProfileDto {
  @IsOptional()
  @ToTrim()
  @IsString()
  @MinLength(2)
  name?: string;
}
