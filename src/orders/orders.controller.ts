import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthRequest } from 'src/auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { FindMyOrdersQueryDto } from './dto/find-my-orders-query.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(@Req() req: AuthRequest, @Body() body: CreateOrderDto) {
    const result = await this.ordersService.checkout(req.user.id, body);

    return {
      message: 'Order placed successfully',
      result,
    };
  }

  @Post(':orderId/reorder')
  @HttpCode(HttpStatus.OK)
  async reorder(@Req() req: AuthRequest, @Param('orderId') orderId: string) {
    await this.ordersService.reorder(req.user.id, orderId);

    return {
      message: 'Order items added to cart successfully',
    };
  }

  @Get('my-orders')
  @HttpCode(HttpStatus.OK)
  async findMyOrders(
    @Req() req: AuthRequest,
    @Query() query: FindMyOrdersQueryDto,
  ) {
    const { orders, meta } = await this.ordersService.findMyOrders(
      req.user.id,
      query,
    );

    return {
      message: 'Orders fetched successfully',
      orders,
      meta,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const order = await this.ordersService.findOne(req.user.id, id);

    return {
      message: 'Order fetched successfully',
      order,
    };
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const order = await this.ordersService.cancelOrder(req.user.id, id);

    return {
      message: 'Order cancelled successfully',
      order,
    };
  }
}
