import { randomUUID } from 'crypto';
import path from 'path';

export function generateFileKey(folder: string, originalName: string): string {
  const extension = path.extname(originalName);

  return `${folder}/${randomUUID()}${extension}`;
}
