import { Transform } from 'class-transformer';

export function ToTrim() {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.trim();
    }

    return value;
  });
}

export function NormalizeEmail() {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.trim().toLowerCase();
    }

    return value;
  });
}
