import { IsEmail, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/string-transform.decorator';

export class ForgotPasswordDto {
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
