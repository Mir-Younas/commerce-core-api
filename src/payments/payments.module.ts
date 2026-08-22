import { Module } from '@nestjs/common';
import { JazzcashController } from './jazzcash/jazzcash.controller';
import { JazzcashService } from './jazzcash/jazzcash.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SafepayController } from './safepay/safepay.controller';
import { SafepayService } from './safepay/safepay.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
  ],
  controllers: [PaymentsController, JazzcashController, SafepayController],

  providers: [PaymentsService, JazzcashService, SafepayService],

  exports: [PaymentsService],
})
export class PaymentsModule {}
