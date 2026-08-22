import { Transform } from 'class-transformer';

export function ToTrim() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }

    return value;
  });
}