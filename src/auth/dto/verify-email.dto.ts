import { IsNotEmpty, IsString } from 'class-validator';
import { ToTrim } from 'src/common/decorators/string-transform.decorator';

export class VerifyEmailDto {
  @ToTrim()
  @IsString()
  @IsNotEmpty()
  token!: string;
}
