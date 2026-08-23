import { IsEmail, MaxLength } from 'class-validator';
import { NormalizeEmail } from 'src/common/decorators/string-transform.decorator';

export class ResendVerificationEmailDto {
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
