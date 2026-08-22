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
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

import { CreateReturnRequestDto } from '../dto/create-return-request.dto';

import { ReturnsService } from '../returns.service';

import type { AuthRequest } from 'src/auth/auth.types';

@Controller('returns')
@UseGuards(JwtAuthGuard)
export class UserReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() request: AuthRequest,
    @Body() body: CreateReturnRequestDto,
  ) {
    const returnRequest = await this.returnsService.create(
      request.user.id,
      body,
    );

    return {
      message: 'Return request created successfully',
      returnRequest,
    };
  }

  @Get()
  async findAll(@Req() request: AuthRequest) {
    const returnRequests = await this.returnsService.findAllForUser(
      request.user.id,
    );

    return {
      message: 'Return requests fetched successfully',
      returnRequests,
    };
  }

  @Get(':id')
  async findOne(
    @Req() request: AuthRequest,

    @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    const returnRequest = await this.returnsService.findOneForUser(
      request.user.id,
      id,
    );

    return {
      message: 'Return request fetched successfully',
      returnRequest,
    };
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Req() request: AuthRequest,

    @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    const returnRequest = await this.returnsService.cancel(request.user.id, id);

    return {
      message: 'Return request cancelled successfully',
      returnRequest,
    };
  }
}
