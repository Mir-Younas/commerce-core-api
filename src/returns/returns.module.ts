import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { UserReturnsController } from './user-returns/user-returns.controller';
import { AdminReturnsController } from './admin-returns/admin-returns.controller';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
  imports: [PaymentsModule],
  providers: [ReturnsService],
  controllers: [UserReturnsController, AdminReturnsController]
})
export class ReturnsModule {}
