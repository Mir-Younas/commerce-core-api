import { createHmac, timingSafeEqual } from 'crypto';

type JazzCashHashFields = Record<
  string,
  string | number | null | undefined
>;

export function createJazzCashSecureHash(
  fields: JazzCashHashFields,
  integritySalt: string,
): string {
  const sortedValues = Object.keys(fields)
    .filter((key) => {
      return (
        key.toLowerCase().startsWith('pp') &&
        key !== 'pp_SecureHash' &&
        fields[key] !== undefined &&
        fields[key] !== null
      );
    })
    .sort()
    .map((key) => String(fields[key]));

  const hashInput = [
    integritySalt,
    ...sortedValues,
  ].join('&');

  return createHmac('sha256', integritySalt)
    .update(hashInput, 'utf8')
    .digest('hex');
}

export function verifyJazzCashSecureHash(
  fields: JazzCashHashFields,
  integritySalt: string,
): boolean {
  const receivedHash = fields.pp_SecureHash;

  if (
    typeof receivedHash !== 'string' ||
    !receivedHash
  ) {
    return false;
  }

  const expectedHash = createJazzCashSecureHash(
    fields,
    integritySalt,
  );

  const receivedBuffer = Buffer.from(
    receivedHash.toLowerCase(),
    'utf8',
  );

  const expectedBuffer = Buffer.from(
    expectedHash.toLowerCase(),
    'utf8',
  );

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(
    receivedBuffer,
    expectedBuffer,
  );
}