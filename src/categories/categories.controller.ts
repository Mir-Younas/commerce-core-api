import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async create(@Body() body: CreateCategoryDto) {
    const category = await this.categoriesService.create(body);

    return {
      message: 'Category created successfully',
      category,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    const categories = await this.categoriesService.findAll();

    return {
      message: 'Categories fetched successfully',
      categories,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    const category = await this.categoriesService.findOne(id);

    return {
      message: 'Category fetched successfully',
      category,
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
  ) {
    const category = await this.categoriesService.update(id, body);

    return {
      message: 'Category updated successfully',
      category,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async delete(@Param('id') id: string) {
    await this.categoriesService.delete(id);

    return {
      message: 'Category deleted successfully',
    };
  }

  @Delete(':id/force')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async forceDelete(@Param('id') id: string) {
    await this.categoriesService.forceDelete(id);

    return {
      message: 'Category and its products deleted successfully',
    };
  }
}