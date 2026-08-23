import { Transform } from 'class-transformer';

export function ToBoolean() {
  return Transform(({ value }: { value: unknown }) => {
    if (value === true || value === 'true') {
      return true;
    }

    if (value === false || value === 'false') {
      return false;
    }

    return value;
  });
}
