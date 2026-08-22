import { Module } from '@nestjs/common';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';
import { UserCouponsController } from './user-coupons/user-coupons.controller';

@Module({
  controllers: [CouponsController, UserCouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
