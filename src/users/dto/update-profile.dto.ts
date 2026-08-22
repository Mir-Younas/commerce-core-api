import { IsOptional, IsString, MinLength } from 'class-validator';
import { ToTrim } from 'src/common/decorators/to-trim.decorator';

export class UpdateProfileDto {
  @IsOptional()
  @ToTrim()
  @IsString()
  @MinLength(2)
  name?: string;
}