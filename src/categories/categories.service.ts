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
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const slug = body.name ? createSlug(body.name) : category.slug;

    const newName = body.name ?? category.name;
    const newDescription = body.description ?? category.description;

    const noChanges =
      newName === category.name &&
      slug === category.slug &&
      newDescription === category.description;

    if (noChanges) {
      throw new ConflictException('No changes detected');
    }

    if (slug !== category.slug) {
      const existingCategory = await this.prisma.category.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (existingCategory) {
        throw new ConflictException('Category already exists');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: newName,
        slug,
        description: newDescription,
      },
    });
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
}
