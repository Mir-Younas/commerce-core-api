import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';

import { PaymentsService } from '../payments.service';
import type { JazzCashCallback } from './jazzcash.types';

@Controller('payments/jazzcash')
export class JazzcashController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('callback')
  async callback(@Body() body: JazzCashCallback, @Res() res: Response) {
    const result = await this.paymentsService.handleJazzCashCallback(body);

    return res.redirect(result.redirectUrl);
  }
}
