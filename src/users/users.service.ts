import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from 'src/common/s3/s3.service';
import { generateFileKey } from '../common/utils/generate-file-key';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isEmailVerified: true,
        profileImageKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.addProfileImageUrl(user);
  }

  async updateMe(userId: string, body: UpdateProfileDto) {
    const hasUpdate = Object.values(body).some((value) => value !== undefined);

    if (!hasUpdate) {
      throw new BadRequestException(
        'Please provide at least one field to update',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        name: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (body.name !== undefined && body.name === existingUser.name) {
      throw new BadRequestException(
        'New name must be different from your current name',
      );
    }

    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(body.name !== undefined && {
          name: body.name,
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isEmailVerified: true,
        profileImageKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.addProfileImageUrl(user);
  }
  async updateProfileImage(userId: string, image: Express.Multer.File) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        profileImageKey: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const newProfileImageKey = generateFileKey(
      `users/${userId}/profile`,
      image.originalname,
    );

    await this.s3Service.uploadFile(image, newProfileImageKey);

    const updatedUser = await this.updateProfileImageKeySafely(
      userId,
      newProfileImageKey,
    );

    if (existingUser.profileImageKey) {
      await this.deleteS3FileSafely(
        existingUser.profileImageKey,
        'old profile image',
      );
    }

    return this.addProfileImageUrl(updatedUser);
  }

  async deleteProfileImage(userId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        profileImageKey: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        profileImageKey: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isEmailVerified: true,
        profileImageKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (existingUser.profileImageKey) {
      await this.deleteS3FileSafely(
        existingUser.profileImageKey,
        'profile image',
      );
    }

    return this.addProfileImageUrl(user);
  }

  private async updateProfileImageKeySafely(
    userId: string,
    newProfileImageKey: string,
  ) {
    try {
      return await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          profileImageKey: newProfileImageKey,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          isEmailVerified: true,
          profileImageKey: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      await this.deleteS3FileSafely(
        newProfileImageKey,
        'new profile image after database update failure',
      );

      throw error;
    }
  }

  private async deleteS3FileSafely(
    key: string,
    context: string,
  ): Promise<void> {
    try {
      await this.s3Service.deleteFile(key);
    } catch (error) {
      this.logger.error(
        `Failed to delete ${context}. Key: ${key}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async addProfileImageUrl<
    T extends {
      profileImageKey: string | null;
    },
  >(
    user: T,
  ): Promise<
    T & {
      profileImageUrl: string | null;
    }
  > {
    if (!user.profileImageKey) {
      return {
        ...user,
        profileImageUrl: null,
      };
    }

    const profileImageUrl = await this.s3Service.getFileSignedUrl(
      user.profileImageKey,
    );

    return {
      ...user,
      profileImageUrl,
    };
  }
}
