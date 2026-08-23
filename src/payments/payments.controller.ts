import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../auth/auth.types';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':id/initiate')
  @HttpCode(HttpStatus.OK)
  async initiateOnlinePayment(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.paymentsService.initiateOnlinePayment(
      req.user.id,
      id,
    );

    return {
      message: 'Payment initiated successfully',
      ...result,
    };
  }

  @Get('order/:orderId')
  @HttpCode(HttpStatus.OK)
  async findByOrder(
    @Req() req: AuthRequest,
    @Param('orderId', ParseUUIDPipe)
    orderId: string,
  ) {
    const payment = await this.paymentsService.findPaymentByOrder(
      req.user.id,
      orderId,
    );

    return {
      message: 'Payment fetched successfully',
      payment,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const payment = await this.paymentsService.findMyPayment(req.user.id, id);

    return {
      message: 'Payment fetched successfully',
      payment,
    };
  }
}
