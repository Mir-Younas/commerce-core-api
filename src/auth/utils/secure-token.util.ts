import * as crypto from 'crypto';

type CreateSecureTokenOptions = {
  secret: string;
  expiresInMs: number;
  byteLength?: number;
};

type SecureTokenResult = {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
};

export function hashToken(token: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(token)
    .digest('hex');
}

export function createSecureToken({
  secret,
  expiresInMs,
  byteLength = 64,
}: CreateSecureTokenOptions): SecureTokenResult {
  const rawToken = crypto.randomBytes(byteLength).toString('hex');

  const tokenHash = hashToken(rawToken, secret);

  const expiresAt = new Date(Date.now() + expiresInMs);

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
}