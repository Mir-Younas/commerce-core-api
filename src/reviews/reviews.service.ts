import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { OrderStatus, ProductStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, productId: string, dto: CreateReviewDto) {
    await this.ensureProductExists(productId);

    await this.ensureUserPurchasedProduct(userId, productId);

    const existingReview = await this.prisma.review.findUnique({
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

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    return this.prisma.review.create({
      data: {
        userId,
        productId,
        rating: dto.rating,
        comment: dto.comment,
      },

      select: this.getReviewSelect(),
    });
  }

  async findByProduct(productId: string) {
    await this.ensureProductExists(productId);

    return this.prisma.review.findMany({
      where: {
        productId,
      },

      select: this.getReviewSelect(),

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.findUserReview(userId, reviewId);

    return this.prisma.review.update({
      where: {
        id: review.id,
      },

      data: {
        rating: dto.rating,
        comment: dto.comment,
      },

      select: this.getReviewSelect(),
    });
  }

  async remove(userId: string, reviewId: string) {
    const review = await this.findUserReview(userId, reviewId);

    return this.prisma.review.delete({
      where: {
        id: review.id,
      },

      select: {
        id: true,
      },
    });
  }

  private async ensureProductExists(productId: string) {
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

  private async ensureUserPurchasedProduct(userId: string, productId: string) {
    const purchasedProduct = await this.prisma.orderItem.findFirst({
      where: {
        productId,

        order: {
          userId,

          status: {
            in: [
              OrderStatus.DELIVERED,
            ],
          },
        },
      },

      select: {
        id: true,
      },
    });

    if (!purchasedProduct) {
      throw new BadRequestException(
        'You can only review products you have purchased',
      );
    }
  }

  private async findUserReview(userId: string, reviewId: string) {
    const review = await this.prisma.review.findFirst({
      where: {
        id: reviewId,
        userId,
      },

      select: {
        id: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  private getReviewSelect() {
    return {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      updatedAt: true,

      user: {
        select: {
          id: true,
          name: true,
          profileImageKey: true,
        },
      },
    };
  }
}
