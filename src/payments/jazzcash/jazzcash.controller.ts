import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { JazzCashCallback } from './jazzcash.types';
import { JazzcashService } from './jazzcash.service';

@Controller('payments/jazzcash')
export class JazzcashController {
  constructor(
    private readonly jazzcashService: JazzcashService
  ) {}

  @Post('callback')
  async callback(@Body() body: JazzCashCallback, @Res() res: Response) {
    const result = await this.jazzcashService.handleJazzCashCallback(body);

    return res.redirect(result.redirectUrl);
  }
}
