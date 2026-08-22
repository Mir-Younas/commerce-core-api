import { UseInterceptors } from '@nestjs/common';
import {
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

export function FileUpload(fieldName: string) {
  return UseInterceptors(
    FileInterceptor(fieldName, {
      storage: memoryStorage(),
    }),
  );
}

export function FilesUpload(fieldName: string, maxCount: number) {
  return UseInterceptors(
    FilesInterceptor(fieldName, maxCount, {
      storage: memoryStorage(),
    }),
  );
}