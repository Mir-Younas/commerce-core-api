import type { Request } from 'express';

export function getStringCookie(
  req: Request,
  cookieName: string,
): string | undefined {
  const value: unknown = req.cookies?.[cookieName];

  return typeof value === 'string' ? value : undefined;
}
