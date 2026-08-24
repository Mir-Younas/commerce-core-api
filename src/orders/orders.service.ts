import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ProductStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  AdminOrderFilterDto,
  AdminOrderSort,
} from './dto/admin-order-filter.dto';
import {
  buildPaginationMeta,
  getPaginationParams,
} from 'src/common/utils/pagination.util';
import { FindMyOrdersQueryDto } from './dto/find-my-orders-query.dto';
import { validateOrderStatusTransition } from './order-status.rules';
import { PaymentsService } from 'src/payments/payments.service';
import { updateProductStock } from 'src/products/helpers/product-stock.helper';
import { CouponsService } from 'src/coupons/coupons.service';
import { CouponCheckoutResult } from 'src/coupons/coupons.type';
import { NotificationsService } from 'src/notifications/notifications.service';

type CartWithItems = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: {
          select: {
            id: true;
            name: true;
            sku: true;
            price: true;
            discountPrice: true;
            stock: true;
            status: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly couponsService: CouponsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async findExistingAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },

      select: {
        id: true,
        fullName: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
      },
    });

    if (!address) {
      throw new NotFoundException('Shipping address not found');
    }

    return address;
  }

  private validateCartItemsForCheckout(cart: CartWithItems): void {
    const unavailableItem = cart.items.find(
      (item) => item.product.status !== ProductStatus.ACTIVE,
    );

    if (unavailableItem) {
      throw new BadRequestException(
        `${unavailableItem.product.name} is not available`,
      );
    }

    const outOfStockItem = cart.items.find((item) => item.product.stock <= 0);

    if (outOfStockItem) {
      throw new BadRequestException(
        `${outOfStockItem.product.name} is out of stock`,
      );
    }

    const insufficientStockItem = cart.items.find(
      (item) => item.quantity > item.product.stock,
    );

    if (insufficientStockItem) {
      throw new BadRequestException(
        `Requested quantity exceeds stock for ${insufficientStockItem.product.name}`,
      );
    }
  }

  private calculateSubtotal(cart: CartWithItems): number {
    return cart.items.reduce((total, item) => {
      const price = item.product.discountPrice ?? item.product.price;

      return total + price * item.quantity;
    }, 0);
  }

  private async sendOrderConfirmedNotificationSafely(
    userId: string,
    order: Awaited<ReturnType<OrdersService['findOne']>>,
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          name: true,
          email: true,
          pushToken: true,
        },
      });

      if (!user) {
        return;
      }

      await this.notificationsService.sendOrderConfirmedNotification({
        to: user.email,
        name: user.name,
        phone: order.phone,
        pushToken: user.pushToken,
        order,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown notification error';

      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to send order confirmed notifications. UserId: ${userId}, OrderId: ${order.id}, Error: ${message}`,
        stack,
      );
    }
  }

  async checkout(userId: string, body: CreateOrderDto) {
    const address = await this.findExistingAddress(userId, body.addressId);

    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                discountPrice: true,
                stock: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    this.validateCartItemsForCheckout(cart);

    const subtotal = this.calculateSubtotal(cart);

    let couponResult: CouponCheckoutResult | null = null;

    if (body.couponCode) {
      couponResult = await this.couponsService.validateForCheckout({
        code: body.couponCode,
        subtotal,
      });
    }

    const discountAmount = couponResult?.discountAmount ?? 0;

    const deliveryFee = 0;

    const total = subtotal - discountAmount + deliveryFee;

    const orderStatus =
      body.paymentMethod === PaymentMethod.ONLINE
        ? OrderStatus.PENDING_PAYMENT
        : OrderStatus.PENDING;

    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          addressId: address.id,
          status: orderStatus,

          subtotal,
          discountAmount,
          deliveryFee,
          total,

          couponId: couponResult?.couponId,
          couponCode: couponResult?.code,

          fullName: address.fullName,
          phone: address.phone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          note: body.note,

          items: {
            create: cart.items.map((item) => {
              const price = item.product.discountPrice ?? item.product.price;

              return {
                productId: item.product.id,
                productName: item.product.name,
                productSku: item.product.sku,
                price,
                quantity: item.quantity,
                total: price * item.quantity,
              };
            }),
          },
        },
        select: {
          id: true,
        },
      });

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          userId,
          method: body.paymentMethod,
          provider:
            body.paymentMethod === PaymentMethod.ONLINE
              ? body.paymentProvider
              : null,
          status: PaymentStatus.PENDING,
          amount: total,
        },
      });

      await updateProductStock(
        tx,
        cart.items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          productName: item.product.name,
        })),
        'decrement',
      );

      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });

      return {
        orderId: order.id,
        payment,
      };
    });

    if (result.payment.method === PaymentMethod.CASH_ON_DELIVERY) {
      const order = await this.findOne(userId, result.orderId);

      await this.sendOrderConfirmedNotificationSafely(userId, order);

      return {
        order,
      };
    }

    const paymentSession = await this.paymentsService.initiateOnlinePayment(
      userId,
      result.payment.id,
    );

    return {
      orderId: result.orderId,
      paymentSession,
    };
  }

  async reorder(userId: string, orderId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          userId,
        },

        select: {
          status: true,

          items: {
            select: {
              productId: true,
              quantity: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== OrderStatus.CANCELLED) {
        throw new BadRequestException('Only cancelled orders can be reordered');
      }

      if (order.items.length === 0) {
        throw new BadRequestException('Order has no items');
      }

      const cart = await tx.cart.upsert({
        where: {
          userId,
        },

        create: {
          userId,
        },

        update: {},

        select: {
          id: true,
        },
      });

      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: {
            id: item.productId,
          },

          select: {
            id: true,
            name: true,
            status: true,
            stock: true,
          },
        });

        if (!product || product.status !== ProductStatus.ACTIVE) {
          throw new BadRequestException(
            'One or more products are no longer available',
          );
        }

        const existingCartItem = await tx.cartItem.findUnique({
          where: {
            cartId_productId: {
              cartId: cart.id,
              productId: product.id,
            },
          },

          select: {
            quantity: true,
          },
        });

        const quantity = (existingCartItem?.quantity ?? 0) + item.quantity;

        if (quantity > product.stock) {
          throw new BadRequestException(
            `Not enough stock available for ${product.name}`,
          );
        }

        await tx.cartItem.upsert({
          where: {
            cartId_productId: {
              cartId: cart.id,
              productId: product.id,
            },
          },

          create: {
            cartId: cart.id,
            productId: product.id,
            quantity: item.quantity,
          },

          update: {
            quantity,
          },
        });
      }
    });
  }

  async findMyOrders(userId: string, query: FindMyOrdersQueryDto) {
    const where: Prisma.OrderWhereInput = {
      userId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const { page, limit, skip } = getPaginationParams(
      query.page,
      query.limit,
      10,
    );

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,

        select: {
          id: true,
          status: true,
          subtotal: true,
          deliveryFee: true,
          total: true,
          fullName: true,
          city: true,
          createdAt: true,
          updatedAt: true,

          _count: {
            select: {
              items: true,
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },

        skip,
        take: limit,
      }),

      this.prisma.order.count({
        where,
      }),
    ]);

    return {
      orders,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },

      select: {
        id: true,
        status: true,

        subtotal: true,
        deliveryFee: true,
        total: true,

        fullName: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        note: true,

        createdAt: true,
        updatedAt: true,

        payment: {
          select: {
            id: true,
            method: true,
            status: true,
            amount: true,
            provider: true,
            paidAt: true,
          },
        },

        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            productSku: true,
            price: true,
            quantity: true,
            total: true,
          },

          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: {
          id: orderId,
          userId,
        },
        include: {
          items: {
            select: {
              productId: true,
              quantity: true,
            },
          },
        },
      });

      if (!existingOrder) {
        throw new NotFoundException('Order not found');
      }

      if (existingOrder.status !== OrderStatus.PENDING) {
        throw new BadRequestException('Only pending orders can be cancelled');
      }

      await updateProductStock(tx, existingOrder.items, 'increment');

      return tx.order.update({
        where: {
          id: existingOrder.id,
        },
        data: {
          status: OrderStatus.CANCELLED,
        },
        select: {
          id: true,
          status: true,
          subtotal: true,
          deliveryFee: true,
          total: true,
          fullName: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          note: true,
          createdAt: true,
          updatedAt: true,
          items: {
            select: {
              id: true,
              productId: true,
              productName: true,
              productSku: true,
              price: true,
              quantity: true,
              total: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
    });

    return order;
  }

  async findAllForAdmin(query: AdminOrderFilterDto) {
    const Orderwhere: Prisma.OrderWhereInput = {};

    if (query.status) {
      Orderwhere.status = query.status;
    }

    if (query.userId) {
      Orderwhere.userId = query.userId;
    }

    if (query.city) {
      Orderwhere.city = {
        contains: query.city,
        mode: 'insensitive',
      };
    }

    if (query.search) {
      Orderwhere.OR = [
        {
          id: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          fullName: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          city: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          user: {
            is: {
              name: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          user: {
            is: {
              email: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    let orderBy: Prisma.OrderOrderByWithRelationInput = {
      createdAt: 'desc',
    };

    if (query.sortBy === AdminOrderSort.OLDEST) {
      orderBy = {
        createdAt: 'asc',
      };
    }

    if (query.sortBy === AdminOrderSort.TOTAL_ASC) {
      orderBy = {
        total: 'asc',
      };
    }

    if (query.sortBy === AdminOrderSort.TOTAL_DESC) {
      orderBy = {
        total: 'desc',
      };
    }

    const { page, limit, skip } = getPaginationParams(query.page, query.limit);

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: Orderwhere,
        select: {
          id: true,
          userId: true,
          status: true,
          subtotal: true,
          deliveryFee: true,
          total: true,
          fullName: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          note: true,
          createdAt: true,
          updatedAt: true,

          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          _count: {
            select: {
              items: true,
            },
          },
        },

        orderBy,
        skip,
        take: limit,
      }),

      this.prisma.order.count({
        where: Orderwhere,
      }),
    ]);

    return {
      orders,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOneForAdmin(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        userId: true,
        status: true,
        subtotal: true,
        deliveryFee: true,
        total: true,
        fullName: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        note: true,
        createdAt: true,
        updatedAt: true,

        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },

        payment: {
          select: {
            id: true,
            method: true,
            status: true,
            amount: true,
            provider: true,
            transactionId: true,
            paidAt: true,
          },
        },

        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            productSku: true,
            price: true,
            quantity: true,
            total: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatusForAdmin(orderId: string, body: UpdateOrderStatusDto) {
    const order = await this.prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          items: {
            select: {
              productId: true,
              quantity: true,
            },
          },
        },
      });

      if (!existingOrder) {
        throw new NotFoundException('Order not found');
      }

      validateOrderStatusTransition(existingOrder.status, body.status);

      if (
        body.status === OrderStatus.CANCELLED &&
        existingOrder.status !== OrderStatus.CANCELLED
      ) {
        await updateProductStock(tx, existingOrder.items, 'increment');
      }

      return tx.order.update({
        where: {
          id: existingOrder.id,
        },
        data: {
          status: body.status,
        },
        select: {
          id: true,
          status: true,
        },
      });
    });

    return order;
  }
}
