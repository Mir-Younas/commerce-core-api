import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

export const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';
export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

 export const ACCESS_TOKEN_MAX_AGE_MS = 60 * 60 * 1000;
 export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function setAuthCookies(
  res: Response,
  configService: ConfigService,
  accessToken: string,
  refreshToken: string,
): void {
  const isProduction =
    configService.get<string>('NODE_ENV') === 'production';

  res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    path: '/',
  });

  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: '/',
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, {
    path: '/',
  });

  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    path: '/',
  });
}
