import {
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
} from '@nestjs/common';

type FileUploadValidationOptions = {
  maxSizeInMb: number;
  fileType: RegExp;
};

export function createFilesUploadValidationPipe(
  options: FileUploadValidationOptions,
) {
  return new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({
        maxSize: options.maxSizeInMb * 1024 * 1024,
      }),
      new FileTypeValidator({
        fileType: options.fileType,
      }),
    ],
  });
}