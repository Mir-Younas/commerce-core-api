import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import type { AuthRequest } from 'src/auth/auth.types';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { AdminUserFilterDto, AdminUserSort } from './dto/admin-user-filter.dto';
import {
  buildPaginationMeta,
  getPaginationParams,
} from 'src/common/utils/pagination.util';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllUsers(query: AdminUserFilterDto) {
    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      where.OR = [
        {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.isEmailVerified !== undefined) {
      where.isEmailVerified = query.isEmailVerified;
    }

    let orderBy: Prisma.UserOrderByWithRelationInput = {
      createdAt: 'desc',
    };

    if (query.sortBy === AdminUserSort.OLDEST) {
      orderBy = {
        createdAt: 'asc',
      };
    }

    if (query.sortBy === AdminUserSort.NAME_ASC) {
      orderBy = {
        name: 'asc',
      };
    }

    if (query.sortBy === AdminUserSort.NAME_DESC) {
      orderBy = {
        name: 'desc',
      };
    }

    const { page, limit, skip } = getPaginationParams(query.page, query.limit);

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy,
        skip,
        take: limit,
      }),

      this.prisma.user.count({
        where,
      }),
    ]);

    return {
      users,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async updateUserStatus(
    admin: AuthRequest['user'],
    userId: string,
    body: UpdateUserStatusDto,
  ) {
    // Cannot change your own status
    if (admin.id === userId) {
      throw new ForbiddenException('You cannot change your own status');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Normal ADMIN cannot modify ADMIN or SUPER_ADMIN
    if (
      admin.role === Role.ADMIN &&
      (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN)
    ) {
      throw new ForbiddenException(
        'Admin cannot change the status of another admin or super admin',
      );
    }

    // Avoid unnecessary update
    if (user.status === body.status) {
      throw new BadRequestException(`User status is already ${body.status}`);
    }

    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        status: body.status,

        ...(body.status === UserStatus.BLOCKED && {
          sessions: {
            deleteMany: {},
          },
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateUserRole(
    admin: AuthRequest['user'],
    userId: string,
    body: UpdateUserRoleDto,
  ) {
    // Cannot change your own role
    if (admin.id === userId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // ADMIN cannot modify another ADMIN or SUPER_ADMIN
    if (
      admin.role === Role.ADMIN &&
      (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN)
    ) {
      throw new ForbiddenException(
        'Admin cannot change the role of another admin or super admin',
      );
    }

    // ADMIN cannot promote a normal user to ADMIN or SUPER_ADMIN
    if (
      admin.role === Role.ADMIN &&
      (body.role === Role.ADMIN || body.role === Role.SUPER_ADMIN)
    ) {
      throw new ForbiddenException(
        'Admin cannot assign admin or super admin roles',
      );
    }

    // No unnecessary database update
    if (user.role === body.role) {
      throw new BadRequestException(`User role is already ${body.role}`);
    }

    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role: body.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
