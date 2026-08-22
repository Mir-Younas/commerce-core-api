import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemQuantityDto } from './dto/update-cart-item-quantity.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateCart(userId: string) {
    return this.prisma.cart.upsert({
      where: {
        userId,
      },
      update: {},
      create: {
        userId,
      },
    });
  }

  // async addItem(userId: string, body: AddCartItemDto) {
  //   const quantity = body.quantity ?? 1;
  //   const cart = await this.getOrCreateCart(userId);

  //   const product = await this.prisma.product.findUnique({
  //     where: {
  //       id: body.productId,
  //     },
  //     select: {
  //       id: true,
  //       stock: true,
  //       status: true,
  //     },
  //   });

  //   if (!product) {
  //     throw new NotFoundException('Product not found');
  //   }

  //   if (product.status !== ProductStatus.ACTIVE) {
  //     throw new BadRequestException('Product is not available');
  //   }

  //   if (product.stock <= 0) {
  //     throw new BadRequestException('Product is out of stock');
  //   }

  //   if (quantity > product.stock) {
  //     throw new BadRequestException('Requested quantity exceeds product stock');
  //   }

  //   const existingCartItem = await this.prisma.cartItem.findUnique({
  //     where: {
  //       cartId_productId: {
  //         cartId: cart.id,
  //         productId: body.productId,
  //       },
  //     },
  //   });

  //   if (existingCartItem) {
  //     const newQuantity = existingCartItem.quantity + quantity;

  //     if (newQuantity > product.stock) {
  //       throw new BadRequestException(
  //         'Requested quantity exceeds product stock',
  //       );
  //     }

  //     await this.prisma.cartItem.update({
  //       where: {
  //         cartId_productId: {
  //           cartId: cart.id,
  //           productId: body.productId,
  //         },
  //       },
  //       data: {
  //         quantity: newQuantity,
  //       },
  //     });

  //     return this.findMyCart(userId);
  //   }

  //   await this.prisma.cartItem.create({
  //     data: {
  //       cartId: cart.id,
  //       productId: body.productId,
  //       quantity: quantity,
  //     },
  //   });

  //   return this.findMyCart(userId);
  // }

  async addItem(userId: string, body: AddCartItemDto) {
    const quantity = body.quantity ?? 1;

    const cart = await this.getOrCreateCart(userId);

    const product = await this.prisma.product.findUnique({
      where: {
        id: body.productId,
      },
      select: {
        id: true,
        stock: true,
        status: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Product is not available');
    }

    if (product.stock <= 0) {
      throw new BadRequestException('Product is out of stock');
    }

    const existingCartItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: body.productId,
        },
      },
    });

    const currentCartQuantity = existingCartItem?.quantity ?? 0;
    const newRequestedQuantity = quantity;
    const requestedQuantity = currentCartQuantity + newRequestedQuantity;
    const availableQuantity = product.stock;
    const allowedQuantity = Math.max(
      availableQuantity - currentCartQuantity,
      0,
    );

    if (requestedQuantity > availableQuantity) {
      const userMessage =
        currentCartQuantity > 0
          ? `You already have ${currentCartQuantity} in cart. You can add only ${allowedQuantity} more.`
          : `You can order only ${availableQuantity} item(s).`;

      throw new BadRequestException({
        message: 'Requested quantity exceeds available stock',
        error: 'Bad Request',
        statusCode: 400,
        details: {
          requestedQuantity,
          availableQuantity,
          currentCartQuantity,
          newRequestedQuantity,
          allowedQuantity,
          userMessage,
        },
      });
    }

    if (existingCartItem) {
      await this.prisma.cartItem.update({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: body.productId,
          },
        },
        data: {
          quantity: requestedQuantity,
        },
      });

      return this.findMyCart(userId);
    }

    await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: body.productId,
        quantity,
      },
    });

    return this.findMyCart(userId);
  }

  async updateItemQuantity(
    userId: string,
    productId: string,
    quantity: number,
  ) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const cartItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      select: {
        id: true,
        product: {
          select: {
            name: true,
            stock: true,
            status: true,
          },
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (cartItem.product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException(
        `${cartItem.product.name} is not available`,
      );
    }

    if (quantity > cartItem.product.stock) {
      throw new BadRequestException(
        `Only ${cartItem.product.stock} items are available`,
      );
    }

    return this.prisma.cartItem.update({
      where: {
        id: cartItem.id,
      },
      data: {
        quantity,
      },
      select: {
        productId: true,
        quantity: true,
      },
    });
  }

  async findMyCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    const cartWithItems = await this.prisma.cart.findUniqueOrThrow({
      where: {
        id: cart.id,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                images: {
                  orderBy: {
                    sortOrder: 'asc',
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    const items = cartWithItems.items.map((item) => {
      const unitPrice = item.product.discountPrice ?? item.product.price;
      const lineTotal = unitPrice * item.quantity;

      return {
        ...item,
        unitPrice,
        lineTotal,
      };
    });

    const totalItems = items.reduce((total, item) => {
      return total + item.quantity;
    }, 0);

    const totalProducts = items.length;

    const subtotal = items.reduce((total, item) => {
      return total + item.lineTotal;
    }, 0);

    return {
      id: cartWithItems.id,
      userId: cartWithItems.userId,
      createdAt: cartWithItems.createdAt,
      updatedAt: cartWithItems.updatedAt,
      items,
      summary: {
        totalItems,
        totalProducts,
        subtotal,
      },
    };
  }

  async updateQuantity(
    userId: string,
    productId: string,
    body: UpdateCartItemQuantityDto,
  ) {
    const cart = await this.getOrCreateCart(userId);

    const cartItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            stock: true,
            status: true,
          },
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Product not found in cart');
    }

    if (cartItem.product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Product is not available');
    }

    if (cartItem.product.stock <= 0) {
      throw new BadRequestException('Product is out of stock');
    }

    if (body.quantity > cartItem.product.stock) {
      throw new BadRequestException('Requested quantity exceeds product stock');
    }

    await this.prisma.cartItem.update({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      data: {
        quantity: body.quantity,
      },
    });

    return this.findMyCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.getOrCreateCart(userId);

    const deletedCartItem = await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    if (deletedCartItem.count === 0) {
      throw new NotFoundException('Product not found in cart');
    }

    return this.findMyCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });
  }
}
