import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createSlug } from '../common/utils/create-slug';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(body: CreateCategoryDto) {
    const slug = createSlug(body.name);

    const existingCategory = await this.prisma.category.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (existingCategory) {
      throw new ConflictException('Category already exists');
    }

    const category = await this.prisma.category.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
      },
    });

    return category;
  }

  async findAll() {
    const categories = await this.prisma.category.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return categories;
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: {
        id,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, body: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const slug = body.name ? createSlug(body.name) : undefined;

    if (slug) {
      const existingCategory = await this.prisma.category.findFirst({
        where: {
          slug,
          NOT: {
            id: category.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingCategory) {
        throw new ConflictException('Category already exists');
      }
    }

    const updatedCategory = await this.prisma.category.update({
      where: {
        id: category.id,
      },
      data: {
        name: body.name,
        slug,
        description: body.description,
      },
    });

    return updatedCategory;
  }

  async delete(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const productsCount = await this.prisma.product.count({
      where: {
        categoryId: category.id,
      },
    });

    if (productsCount > 0) {
      throw new BadRequestException(
        'Cannot delete category because it has products',
      );
    }

    await this.prisma.category.delete({
      where: {
        id: category.id,
      },
    });
  }

  async forceDelete(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.deleteMany({
        where: {
          categoryId: category.id,
        },
      });

      await tx.category.delete({
        where: {
          id: category.id,
        },
      });
    });
  }
}