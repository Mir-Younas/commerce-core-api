import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { S3Service } from '../common/s3/s3.service';
import { createSlug } from '../common/utils/create-slug';
import { generateFileKey } from '../common/utils/generate-file-key';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto, ProductSort } from './dto/product-filter.dto';
import { AdminProductFilterDto } from './dto/admin-product-filter.dto';
import {
  buildPaginationMeta,
  getPaginationParams,
} from 'src/common/utils/pagination.util';

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: true;
    images: true;
  };
}>;

type ProductWithSignedUrls = Omit<ProductWithRelations, 'images'> & {
  images: Array<
    ProductWithRelations['images'][number] & {
      url: string;
    }
  >;
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }

  private async ensureProductExists(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  private async addSignedUrlsToProduct(product: ProductWithRelations) {
    const images = await this.s3Service.addSignedUrlsToFiles(product.images);

    return {
      ...product,
      images,
    };
  }

  private async findOneById(id: string): Promise<ProductWithSignedUrls> {
    const product = await this.prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        category: true,
        images: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.addSignedUrlsToProduct(product);
  }

  private async deleteFilesSafely(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    try {
      await this.s3Service.deleteManyFiles(keys);
    } catch {
      // Later you can add logger here.
      // We do not throw here because DB work may already be completed.
    }
  }
  private async fetchProducts(query: ProductFilterDto, status?: ProductStatus) {
    const productWhere: Prisma.ProductWhereInput = {};

    if (status) {
      productWhere.status = status;
    }

    if (query.categoryId) {
      productWhere.categoryId = query.categoryId;
    }

    if (query.search) {
      productWhere.OR = [
        {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          brand: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          sku: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      productWhere.price = {};

      if (query.minPrice !== undefined) {
        productWhere.price.gte = query.minPrice;
      }

      if (query.maxPrice !== undefined) {
        productWhere.price.lte = query.maxPrice;
      }
    }

    if (query.inStock === true) {
      productWhere.stock = {
        gt: 0,
      };
    }

    if (query.discountOnly === true) {
      productWhere.discountPrice = {
        not: null,
      };
    }

    if (query.isFeatured === true) {
      productWhere.isFeatured = true;
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = {
      createdAt: 'desc',
    };

    if (query.sortBy === ProductSort.OLDEST) {
      orderBy = {
        createdAt: 'asc',
      };
    }

    if (query.sortBy === ProductSort.PRICE_ASC) {
      orderBy = {
        price: 'asc',
      };
    }

    if (query.sortBy === ProductSort.PRICE_DESC) {
      orderBy = {
        price: 'desc',
      };
    }

    const { page, limit, skip } = getPaginationParams(query.page, query.limit);

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: productWhere,
        include: {
          category: true,
          images: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),

      this.prisma.product.count({
        where: productWhere,
      }),
    ]);

    const productIds = products.map((product) => product.id);

    const reviewSummaryMap = await this.getReviewSummaryMap(productIds);

    const productsWithSignedUrls = await Promise.all(
      products.map((product) => this.addSignedUrlsToProduct(product)),
    );

    const productsWithReviewSummary = productsWithSignedUrls.map((product) => {
      const reviewSummary = reviewSummaryMap.get(product.id);

      return {
        ...product,

        averageRating: reviewSummary?.averageRating ?? 0,

        reviewCount: reviewSummary?.reviewCount ?? 0,
      };
    });

    return {
      products: productsWithReviewSummary,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  private async getReviewSummaryMap(productIds: string[]) {
    if (productIds.length === 0) {
      return new Map<
        string,
        {
          averageRating: number;
          reviewCount: number;
        }
      >();
    }

    const reviewSummaries = await this.prisma.review.groupBy({
      by: ['productId'],

      where: {
        productId: {
          in: productIds,
        },
      },

      _avg: {
        rating: true,
      },

      _count: {
        _all: true,
      },
    });

    return new Map(
      reviewSummaries.map((summary) => [
        summary.productId,
        {
          averageRating: summary._avg.rating ?? 0,

          reviewCount: summary._count._all,
        },
      ]),
    );
  }

  async create(body: CreateProductDto) {
    await this.ensureCategoryExists(body.categoryId);

    const slug = createSlug(body.name);

    const existingProduct = await this.prisma.product.findFirst({
      where: {
        OR: [{ slug }, { sku: body.sku }],
      },
      select: {
        id: true,
      },
    });

    if (existingProduct) {
      throw new ConflictException(
        'Product with this name or SKU already exists',
      );
    }

    return this.prisma.product.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
        price: body.price,
        discountPrice: body.discountPrice,
        stock: body.stock,
        sku: body.sku,
        brand: body.brand,
        status: body.status,
        isFeatured: body.isFeatured,
        categoryId: body.categoryId,
      },
      include: {
        category: true,
      },
    });
  }

  async addImages(
    productId: string,
    images: Express.Multer.File[],
  ): Promise<number> {
    if (!images || images.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    await this.ensureProductExists(productId);

    const imageKeys = images.map((image) =>
      generateFileKey('products', image.originalname),
    );

    try {
      await this.s3Service.uploadManyFiles(images, imageKeys);

      const uploadedImagesCount = await this.prisma.$transaction(async (tx) => {
        const currentImagesCount = await tx.productImage.count({
          where: {
            productId,
          },
        });

        const result = await tx.productImage.createMany({
          data: imageKeys.map((key, index) => ({
            key,
            productId,
            isPrimary: currentImagesCount === 0 && index === 0,
            sortOrder: currentImagesCount + index,
          })),
        });

        return result.count;
      });

      return uploadedImagesCount;
    } catch (error) {
      await this.deleteFilesSafely(imageKeys);

      throw error;
    }
  }

  async setPrimaryImage(
    productId: string,
    imageId: string,
  ): Promise<ProductWithSignedUrls> {
    const image = await this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
      select: {
        id: true,
      },
    });

    if (!image) {
      throw new NotFoundException('Product image not found');
    }

    await this.prisma.$transaction([
      this.prisma.productImage.updateMany({
        where: {
          productId,
        },
        data: {
          isPrimary: false,
        },
      }),

      this.prisma.productImage.update({
        where: {
          id: imageId,
        },
        data: {
          isPrimary: true,
        },
      }),
    ]);

    return this.findOneById(productId);
  }

  async deleteImage(
    productId: string,
    imageId: string,
  ): Promise<ProductWithSignedUrls> {
    const image = await this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
      select: {
        id: true,
        key: true,
        isPrimary: true,
      },
    });

    if (!image) {
      throw new NotFoundException('Product image not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.delete({
        where: {
          id: imageId,
        },
      });

      if (image.isPrimary) {
        const nextImage = await tx.productImage.findFirst({
          where: {
            productId,
          },
          orderBy: {
            sortOrder: 'asc',
          },
          select: {
            id: true,
          },
        });

        if (nextImage) {
          await tx.productImage.update({
            where: {
              id: nextImage.id,
            },
            data: {
              isPrimary: true,
            },
          });
        }
      }
    });

    await this.deleteFilesSafely([image.key]);

    return this.findOneById(productId);
  }

  async findAll(query: ProductFilterDto) {
    return this.fetchProducts(query, ProductStatus.ACTIVE);
  }

  async findAllForAdmin(query: AdminProductFilterDto) {
    return this.fetchProducts(query, query.status);
  }

  async findOneBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: {
        slug,
      },

      include: {
        category: true,

        images: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const reviewSummaryMap = await this.getReviewSummaryMap([product.id]);

    const reviewSummary = reviewSummaryMap.get(product.id);

    const productWithSignedUrls = await this.addSignedUrlsToProduct(product);

    return {
      ...productWithSignedUrls,

      averageRating: reviewSummary?.averageRating ?? 0,

      reviewCount: reviewSummary?.reviewCount ?? 0,
    };
  }

  async update(
    id: string,
    body: UpdateProductDto,
  ): Promise<ProductWithSignedUrls> {
    await this.ensureProductExists(id);

    if (body.categoryId) {
      await this.ensureCategoryExists(body.categoryId);
    }

    const slug = body.name ? createSlug(body.name) : undefined;

    if (slug || body.sku) {
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          NOT: {
            id,
          },
          OR: [
            ...(slug ? [{ slug }] : []),
            ...(body.sku ? [{ sku: body.sku }] : []),
          ],
        },
        select: {
          id: true,
        },
      });

      if (existingProduct) {
        throw new ConflictException(
          'Product with this name or SKU already exists',
        );
      }
    }

    const updatedProduct = await this.prisma.product.update({
      where: {
        id,
      },
      data: {
        name: body.name,
        slug,
        description: body.description,
        price: body.price,
        discountPrice: body.discountPrice,
        stock: body.stock,
        sku: body.sku,
        brand: body.brand,
        status: body.status,
        isFeatured: body.isFeatured,
        categoryId: body.categoryId,
      },
      include: {
        category: true,
        images: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    return this.addSignedUrlsToProduct(updatedProduct);
  }

  async delete(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        images: {
          select: {
            key: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const imageKeys = product.images.map((image) => image.key);

    await this.prisma.product.delete({
      where: {
        id,
      },
    });

    await this.deleteFilesSafely(imageKeys);
  }
}
