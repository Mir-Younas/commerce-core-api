import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { S3Module } from 'src/common/s3/s3.module';

@Module({
  imports: [S3Module],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
