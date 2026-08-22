import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { EmailModule } from 'src/email/email.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { CouponsModule } from 'src/coupons/coupons.module';

@Module({
  imports:[EmailModule, PaymentsModule, CouponsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports:[OrdersService]
})
export class OrdersModule {}
