import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { Role } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

import { UpdateReturnStatusDto } from '../dto/update-return-status.dto';

import { ReturnsService } from '../returns.service';

@Controller('admin/returns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  async findAll() {
    const returnRequests = await this.returnsService.findAllForAdmin();

    return {
      message: 'Return requests fetched successfully',
      returnRequests,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    const returnRequest = await this.returnsService.findOneForAdmin(id);

    return {
      message: 'Return request fetched successfully',
      returnRequest,
    };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id', ParseUUIDPipe)
    id: string,

    @Body()
    body: UpdateReturnStatusDto,
  ) {
    const returnRequest = await this.returnsService.updateStatus(id, body);

    return {
      message: 'Return request status updated successfully',
      returnRequest,
    };
  }
}
