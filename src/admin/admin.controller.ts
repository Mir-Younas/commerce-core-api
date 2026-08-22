import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminProductFilterDto } from '../products/dto/admin-product-filter.dto';
import { ProductsService } from '../products/products.service';
import { AdminService } from './admin.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import type { AuthRequest } from 'src/auth/auth.types';
import { AdminUserFilterDto } from './dto/admin-user-filter.dto';
import { AdminOrderFilterDto } from 'src/orders/dto/admin-order-filter.dto';
import { OrdersService } from 'src/orders/orders.service';
import { UpdateOrderStatusDto } from 'src/orders/dto/update-order-status.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly adminService: AdminService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('products')
  @HttpCode(HttpStatus.OK)
  async findAllProducts(@Query() query: AdminProductFilterDto) {
    const result = await this.productsService.findAllForAdmin(query);

    return {
      message: 'Products fetched successfully',
      ...result,
    };
  }

  @Get('users')
  @HttpCode(HttpStatus.OK)
  async findAllUsers(@Query() query: AdminUserFilterDto) {
    const { users, meta } = await this.adminService.findAllUsers(query);

    return {
      message: 'Users fetched successfully',
      users,
      meta,
    };
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    const user = await this.adminService.updateUserStatus(req.user, id, body);

    return {
      message: 'User status updated successfully',
      user,
    };
  }
  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  async updateUserRole(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserRoleDto,
  ) {
    const user = await this.adminService.updateUserRole(req.user, id, body);

    return {
      message: 'User role updated successfully',
      user,
    };
  }

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  async findAllOrders(@Query() query: AdminOrderFilterDto) {
    const { orders, meta } = await this.ordersService.findAllForAdmin(query);

    return {
      message: 'Orders fetched successfully',
      orders,
      meta,
    };
  }

  @Get('orders/:id')
  @HttpCode(HttpStatus.OK)
  async findOneOrder(@Param('id', ParseUUIDPipe) id: string) {
    const order = await this.ordersService.findOneForAdmin(id);

    return {
      message: 'Order fetched successfully',
      order,
    };
  }

  @Patch('orders/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    const order = await this.ordersService.updateStatusForAdmin(id, body);

    return {
      message: 'Order status updated successfully',
      order,
    };
  }
}
