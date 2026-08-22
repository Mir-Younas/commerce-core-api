import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName =
      this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME');

    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  async uploadFile(file: Express.Multer.File, key: string): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
  }

  async uploadManyFiles(
    files: Express.Multer.File[],
    keys: string[],
  ): Promise<void> {
    if (files.length !== keys.length) {
      throw new InternalServerErrorException('Files and keys count must match');
    }

    const results = await Promise.allSettled(
      files.map((file, index) => this.uploadFile(file, keys[index])),
    );

    const hasFailedUpload = results.some(
      (result) => result.status === 'rejected',
    );

    if (hasFailedUpload) {
      throw new InternalServerErrorException(
        'One or more files failed to upload',
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  async deleteManyFiles(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    await this.s3Client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: keys.map((key) => ({
            Key: key,
          })),
        },
      }),
    );
  }

  async getFileSignedUrl(key: string): Promise<string> {
    const expiresIn =
      Number(
        this.configService.get<string>('AWS_S3_SIGNED_URL_EXPIRES_IN_SECONDS'),
      ) || 3600;

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn,
    });
  }

  async addSignedUrlsToFiles<T extends { key: string }>(
    files: T[],
  ): Promise<Array<T & { url: string }>> {
    return Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await this.getFileSignedUrl(file.key),
      })),
    );
  }
}
