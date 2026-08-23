import {
  Controller,
  Delete,
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

import { WishlistService } from './wishlist.service';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post(':productId')
  @HttpCode(HttpStatus.CREATED)
  async addToWishlist(
    @Req() req: AuthRequest,
    @Param('productId', ParseUUIDPipe)
    productId: string,
  ) {
    const wishlistItem = await this.wishlistService.addToWishlist(
      req.user.id,
      productId,
    );

    return {
      message: 'Product added to wishlist successfully',
      wishlistItem,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findMyWishlist(@Req() req: AuthRequest) {
    const wishlist = await this.wishlistService.findMyWishlist(req.user.id);

    return {
      message: 'Wishlist fetched successfully',
      wishlist,
    };
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  async removeFromWishlist(
    @Req() req: AuthRequest,
    @Param('productId', ParseUUIDPipe)
    productId: string,
  ) {
    const wishlistItem = await this.wishlistService.removeFromWishlist(
      req.user.id,
      productId,
    );

    return {
      message: 'Product removed from wishlist successfully',
      wishlistItem,
    };
  }
}
