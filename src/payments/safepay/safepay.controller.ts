import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';

import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import { SafepayService } from './safepay.service';

@Controller('payments/safepay')
export class SafepayController {
  constructor(private readonly safepayService: SafepayService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req()
    request: RawBodyRequest<Request>,

    @Headers('x-sfpy-signature')
    signature?: string,
  ) {
    await this.safepayService.handleWebhook(request.rawBody, signature);

    return {
      received: true,
    };
  }
}
