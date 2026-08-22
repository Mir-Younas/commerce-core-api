import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ACCESS_TOKEN_MAX_AGE_MS } from './auth-cookies';

export async function createAccessToken(
  jwtService: JwtService,
  configService: ConfigService,
  userId: string,
): Promise<string> {
  return jwtService.signAsync(
    { sub: userId },
    {
      secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TOKEN_MAX_AGE_MS ,
    },
  );
}