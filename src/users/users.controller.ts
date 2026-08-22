import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Patch,
  Get,
  Req,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../auth/auth.types';

import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

import { FileUpload } from '../common/decorators/files-upload.decorator';
import { createFilesUploadValidationPipe } from 'src/common/utils/file-upload-validation';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async findMe(@Req() req: AuthRequest) {
    const user = await this.usersService.findMe(req.user.id);

    return {
      message: 'Profile fetched successfully',
      user,
    };
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateMe(@Req() req: AuthRequest, @Body() body: UpdateProfileDto) {
    const user = await this.usersService.updateMe(req.user.id, body);

    return {
      message: 'Profile updated successfully',
      user,
    };
  }

  @Patch('me/profile-image')
  @HttpCode(HttpStatus.OK)
  @FileUpload('image')
  async updateProfileImage(
    @Req() req: AuthRequest,

    @UploadedFile(
      createFilesUploadValidationPipe({
        maxSizeInMb: 2,
        fileType: /(jpg|jpeg|png|webp)$/,
      }),
    )
    image: Express.Multer.File,
  ) {
    const user = await this.usersService.updateProfileImage(req.user.id, image);

    return {
      message: 'Profile image updated successfully',
      user,
    };
  }

  @Delete('me/profile-image')
  @HttpCode(HttpStatus.OK)
  async deleteProfileImage(@Req() req: AuthRequest) {
    const user = await this.usersService.deleteProfileImage(req.user.id);

    return {
      message: 'Profile image removed successfully',
      user,
    };
  }
}
