import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import type { AuthRequest } from 'src/auth/auth.types';

import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('products/:productId')
  async create(
    @Req() req: AuthRequest,
    @Param('productId', ParseUUIDPipe)
    productId: string,
    @Body() body: CreateReviewDto,
  ) {
    const review = await this.reviewsService.create(
      req.user.id,
      productId,
      body,
    );

    return {
      message: 'Review created successfully',
      review,
    };
  }

  @Get('products/:productId')
  async findByProduct(
    @Param('productId', ParseUUIDPipe)
    productId: string,
  ) {
    const reviews = await this.reviewsService.findByProduct(productId);

    return {
      reviews,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':reviewId')
  async update(
    @Req() req: AuthRequest,
    @Param('reviewId', ParseUUIDPipe)
    reviewId: string,
    @Body() body: UpdateReviewDto,
  ) {
    const review = await this.reviewsService.update(
      req.user.id,
      reviewId,
      body,
    );

    return {
      message: 'Review updated successfully',
      review,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':reviewId')
  async remove(
    @Req() req: AuthRequest,
    @Param('reviewId', ParseUUIDPipe)
    reviewId: string,
  ) {
    const review = await this.reviewsService.remove(req.user.id, reviewId);

    return {
      message: 'Review deleted successfully',
      review,
    };
  }
}
