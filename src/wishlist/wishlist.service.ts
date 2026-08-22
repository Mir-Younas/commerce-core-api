import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async addToWishlist(userId: string, productId: string) {
    await this.ensureProductExists(productId);

    const existingWishlistItem = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },

      select: {
        id: true,
      },
    });

    if (existingWishlistItem) {
      throw new ConflictException('Product is already in wishlist');
    }

    return this.prisma.wishlistItem.create({
      data: {
        userId,
        productId,
      },

      select: {
        id: true,
        createdAt: true,

        product: {
          select: {
            id: true,
            name: true,
            price: true,
            discountPrice: true,
            stock: true,
          },
        },
      },
    });
  }

  async findMyWishlist(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: {
        userId,
      },

      select: {
        id: true,
        createdAt: true,

        product: {
          select: {
            id: true,
            name: true,
            price: true,
            discountPrice: true,
            stock: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async removeFromWishlist(userId: string, productId: string) {
    const wishlistItem = await this.findWishlistItem(userId, productId);

    return this.prisma.wishlistItem.delete({
      where: {
        id: wishlistItem.id,
      },

      select: {
        id: true,
        productId: true,
      },
    });
  }

  private async ensureProductExists(productId: string): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        status: ProductStatus.ACTIVE,
      },

      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  private async findWishlistItem(userId: string, productId: string) {
    const wishlistItem = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },

      select: {
        id: true,
        productId: true,
      },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Product is not in wishlist');
    }

    return wishlistItem;
  }
}
