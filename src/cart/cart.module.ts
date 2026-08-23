import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { S3Module } from 'src/common/s3/s3.module';

@Module({
  imports: [S3Module],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
