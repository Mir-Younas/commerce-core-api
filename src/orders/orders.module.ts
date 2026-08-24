import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PaymentsModule } from 'src/payments/payments.module';
import { CouponsModule } from 'src/coupons/coupons.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [PaymentsModule, CouponsModule, NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
