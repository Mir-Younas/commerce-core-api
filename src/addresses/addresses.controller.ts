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

import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: AuthRequest, @Body() body: CreateAddressDto) {
    const address = await this.addressesService.create(req.user.id, body);

    return {
      message: 'Address created successfully',
      address,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Req() req: AuthRequest) {
    const addresses = await this.addressesService.findAll(req.user.id);

    return {
      message: 'Addresses fetched successfully',
      addresses,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    const address = await this.addressesService.findOne(req.user.id, id);

    return {
      message: 'Address fetched successfully',
      address,
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe)
    id: string,
    @Body() body: UpdateAddressDto,
  ) {
    const address = await this.addressesService.update(req.user.id, id, body);

    return {
      message: 'Address updated successfully',
      address,
    };
  }

  @Patch(':id/default')
  @HttpCode(HttpStatus.OK)
  async setDefault(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    const address = await this.addressesService.setDefault(req.user.id, id);

    return {
      message: 'Default address updated successfully',
      address,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    const address = await this.addressesService.remove(req.user.id, id);

    return {
      message: 'Address deleted successfully',
      address,
    };
  }
}
