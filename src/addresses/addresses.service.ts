import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAddressDto) {
    const existingAddress = await this.prisma.address.findFirst({
      where: {
        userId,
      },

      select: {
        id: true,
      },
    });

    const isDefault = !existingAddress || dto.isDefault === true;

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: {
            userId,
            isDefault: true,
          },

          data: {
            isDefault: false,
          },
        });
      }

      return tx.address.create({
        data: {
          userId,

          fullName: dto.fullName,
          phone: dto.phone,

          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,

          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country,

          isDefault,
        },

        select: this.getAddressSelect(),
      });
    });
  }

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: {
        userId,
      },

      select: this.getAddressSelect(),

      orderBy: [
        {
          isDefault: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async findOne(userId: string, addressId: string) {
    return this.findUserAddress(userId, addressId);
  }

  async update(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.findUserAddressForAction(userId, addressId);

    if (dto.isDefault === false && address.isDefault) {
      throw new BadRequestException('Default address cannot be unset directly');
    }

    if (dto.isDefault === true) {
      return this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: {
            userId,
            isDefault: true,
          },

          data: {
            isDefault: false,
          },
        });

        return tx.address.update({
          where: {
            id: address.id,
          },

          data: {
            fullName: dto.fullName,
            phone: dto.phone,

            addressLine1: dto.addressLine1,
            addressLine2: dto.addressLine2,

            city: dto.city,
            state: dto.state,
            postalCode: dto.postalCode,
            country: dto.country,

            isDefault: true,
          },

          select: this.getAddressSelect(),
        });
      });
    }

    return this.prisma.address.update({
      where: {
        id: address.id,
      },

      data: {
        fullName: dto.fullName,
        phone: dto.phone,

        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,

        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
      },

      select: this.getAddressSelect(),
    });
  }

  async setDefault(userId: string, addressId: string) {
    const address = await this.findUserAddressForAction(userId, addressId);

    if (address.isDefault) {
      throw new BadRequestException('Address is already default');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: {
          userId,
          isDefault: true,
        },

        data: {
          isDefault: false,
        },
      });

      return tx.address.update({
        where: {
          id: address.id,
        },

        data: {
          isDefault: true,
        },

        select: this.getAddressSelect(),
      });
    });
  }

  async remove(userId: string, addressId: string) {
    const address = await this.findUserAddressForAction(userId, addressId);

    return this.prisma.$transaction(async (tx) => {
      const deletedAddress = await tx.address.delete({
        where: {
          id: address.id,
        },

        select: {
          id: true,
        },
      });

      if (address.isDefault) {
        const nextAddress = await tx.address.findFirst({
          where: {
            userId,
          },

          orderBy: {
            createdAt: 'desc',
          },

          select: {
            id: true,
          },
        });

        if (nextAddress) {
          await tx.address.update({
            where: {
              id: nextAddress.id,
            },

            data: {
              isDefault: true,
            },
          });
        }
      }

      return deletedAddress;
    });
  }

  private async findUserAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },

      select: this.getAddressSelect(),
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  private async findUserAddressForAction(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },

      select: {
        id: true,
        isDefault: true,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  private getAddressSelect() {
    return {
      id: true,

      fullName: true,
      phone: true,

      addressLine1: true,
      addressLine2: true,

      city: true,
      state: true,
      postalCode: true,
      country: true,

      isDefault: true,

      createdAt: true,
      updatedAt: true,
    };
  }
}
