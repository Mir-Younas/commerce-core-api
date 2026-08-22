import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemQuantityDto } from './dto/update-cart-item-quantity.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  async addItem(@Req() req: AuthRequest, @Body() body: AddCartItemDto) {
    const cart = await this.cartService.addItem(req.user.id, body);

    return {
      message: 'Product added to cart successfully',
      cart,
    };
  }

  @Patch('items/:productId')
  async updateItemQuantity(
    @Req() req: AuthRequest,
    @Param('productId') productId: string,
    @Body() body: UpdateCartItemQuantityDto,
  ) {
    const item = await this.cartService.updateItemQuantity(
      req.user.id,
      productId,
      body.quantity,
    );

    return {
      message: 'Cart item quantity updated successfully',
      item,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findMyCart(@Req() req: AuthRequest) {
    const cart = await this.cartService.findMyCart(req.user.id);

    return {
      message: 'Cart fetched successfully',
      cart,
    };
  }

  @Patch('items/:productId')
  @HttpCode(HttpStatus.OK)
  async updateQuantity(
    @Req() req: AuthRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: UpdateCartItemQuantityDto,
  ) {
    const cart = await this.cartService.updateQuantity(
      req.user.id,
      productId,
      body,
    );

    return {
      message: 'Cart item quantity updated successfully',
      cart,
    };
  }

  @Delete('items/:productId')
  @HttpCode(HttpStatus.OK)
  async removeItem(
    @Req() req: AuthRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const cart = await this.cartService.removeItem(req.user.id, productId);

    return {
      message: 'Cart item removed successfully',
      cart,
    };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async clearCart(@Req() req: AuthRequest) {
    await this.cartService.clearCart(req.user.id);

    return {
      message: 'Cart cleared successfully',
    };
  }
}
