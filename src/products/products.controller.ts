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
  Query,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FilesUpload } from '../common/decorators/files-upload.decorator';
import { createFilesUploadValidationPipe } from 'src/common/utils/file-upload-validation';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import { ProductFilterDto } from './dto/product-filter.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async create(@Body() body: CreateProductDto) {
    const product = await this.productsService.create(body);

    return {
      message: 'Product created successfully',
      product,
    };
  }

  @Post(':id/images')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @FilesUpload('images', 5)
  async addImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles(
      createFilesUploadValidationPipe({
        maxSizeInMb: 2,
        fileType: /(jpg|jpeg|png|webp)$/,
      }),
    )
    images: Express.Multer.File[],
  ) {
    const uploadedImagesCoun = await this.productsService.addImages(id, images);

    return {
      message: 'Product images uploaded successfully',
      uploadedImagesCoun,
    };
  }

  @Patch(':id/images/:imageId/primary')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async setPrimaryImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    const product = await this.productsService.setPrimaryImage(id, imageId);

    return {
      message: 'Primary image updated successfully',
      product,
    };
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async deleteImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    const product = await this.productsService.deleteImage(id, imageId);

    return {
      message: 'Product image deleted successfully',
      product,
    };
  }

  @Get()
  async findAll(@Query() query: ProductFilterDto) {
    const { products, meta } = await this.productsService.findAll(query);

    return {
      message: 'Products fetched successfully',
      products,
      meta,
    };
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const product = await this.productsService.findOneBySlug(slug);

    return {
      message: 'Product fetched successfully',
      product,
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProductDto,
  ) {
    const product = await this.productsService.update(id, body);

    return {
      message: 'Product updated successfully',
      product,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.productsService.delete(id);

    return {
      message: 'Product deleted successfully',
    };
  }
}
