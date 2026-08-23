import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { OrderStatus, PaymentMethod, ReturnStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';

import {
  FindOwnedReturnRequestInput,
  FindReturnableOrderInput,
  ValidateReturnQuantityInput,
} from './returns.types';
import { PaymentsService } from 'src/payments/payments.service';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async create(userId: string, body: CreateReturnRequestDto) {
    const order = await this.findReturnableOrder({
      userId,
      orderId: body.orderId,
    });

    this.ensureUniqueOrderItems(body.items.map((item) => item.orderItemId));

    const requestedOrderItemIds = body.items.map((item) => item.orderItemId);

    const existingReturnedQuantities = await this.getReturnedQuantityMap(
      requestedOrderItemIds,
    );

    const orderItemMap = new Map(order.items.map((item) => [item.id, item]));

    for (const item of body.items) {
      const orderItem = orderItemMap.get(item.orderItemId);

      if (!orderItem) {
        throw new BadRequestException(
          'One or more return items do not belong to this order',
        );
      }

      const alreadyReturnedQuantity =
        existingReturnedQuantities.get(orderItem.id) ?? 0;

      this.validateReturnQuantity({
        orderItemId: orderItem.id,

        purchasedQuantity: orderItem.quantity,

        requestedQuantity: item.quantity,

        alreadyReturnedQuantity,
      });
    }

    return this.prisma.returnRequest.create({
      data: {
        userId,
        orderId: order.id,

        items: {
          create: body.items.map((item) => ({
            orderItemId: item.orderItemId,

            quantity: item.quantity,

            reason: item.reason,

            comment: item.comment,
          })),
        },
      },

      select: this.getReturnRequestSelect(),
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.returnRequest.findMany({
      where: {
        userId,
      },

      select: this.getReturnRequestSelect(),

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneForUser(userId: string, returnRequestId: string) {
    return this.findOwnedReturnRequest({
      userId,
      returnRequestId,
    });
  }

  async cancel(userId: string, returnRequestId: string) {
    const returnRequest = await this.findOwnedReturnRequest({
      userId,
      returnRequestId,
    });

    if (returnRequest.status !== ReturnStatus.PENDING) {
      throw new BadRequestException(
        'Only pending return requests can be cancelled',
      );
    }

    return this.prisma.returnRequest.update({
      where: {
        id: returnRequest.id,
      },

      data: {
        status: ReturnStatus.CANCELLED,
      },

      select: {
        id: true,
        status: true,
      },
    });
  }

  async findAllForAdmin() {
    return this.prisma.returnRequest.findMany({
      select: this.getAdminReturnRequestSelect(),

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneForAdmin(returnRequestId: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: {
        id: returnRequestId,
      },

      select: this.getAdminReturnRequestSelect(),
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    return returnRequest;
  }

  // async updateStatus(returnRequestId: string, body: UpdateReturnStatusDto) {
  //   const returnRequest = await this.prisma.returnRequest.findUnique({
  //     where: {
  //       id: returnRequestId,
  //     },

  //     select: {
  //       id: true,
  //       status: true,
  //       orderId: true,

  //       order: {
  //         select: {
  //           payment: {
  //             select: {
  //               id: true,
  //               method: true,
  //               provider: true,
  //               status: true,
  //               amount: true,
  //               transactionId: true,
  //             },
  //           },
  //         },
  //       },
  //     },
  //   });

  //   if (!returnRequest) {
  //     throw new NotFoundException('Return request not found');
  //   }

  //   this.validateStatusTransition(returnRequest.status, body.status);

  //   return this.prisma.returnRequest.update({
  //     where: {
  //       id: returnRequest.id,
  //     },

  //     data: {
  //       status: body.status,

  //       adminNote: body.adminNote,
  //     },

  //     select: this.getAdminReturnRequestSelect(),
  //   });
  // }

  async updateStatus(returnRequestId: string, body: UpdateReturnStatusDto) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: {
        id: returnRequestId,
      },

      select: {
        id: true,
        status: true,

        order: {
          select: {
            payment: {
              select: {
                id: true,
                method: true,
              },
            },
          },
        },
      },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    this.validateStatusTransition(returnRequest.status, body.status);

    const updatedReturn = await this.prisma.returnRequest.update({
      where: {
        id: returnRequest.id,
      },

      data: {
        status: body.status,

        adminNote: body.adminNote,
      },

      select: this.getAdminReturnRequestSelect(),
    });

    if (body.status === ReturnStatus.RETURNED) {
      const payment = returnRequest.order.payment;

      if (!payment) {
        throw new BadRequestException(
          'Payment record not found for this order',
        );
      }

      if (payment.method === PaymentMethod.ONLINE) {
        await this.paymentsService.createRefundRequest({
          paymentId: payment.id,
        });
      }
    }

    return updatedReturn;
  }

  private async findReturnableOrder(params: FindReturnableOrderInput) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: params.orderId,
        userId: params.userId,
      },

      select: {
        id: true,
        status: true,

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
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Only delivered orders can be returned');
    }

    return order;
  }

  private ensureUniqueOrderItems(orderItemIds: string[]): void {
    const uniqueOrderItemIds = new Set(orderItemIds);

    if (uniqueOrderItemIds.size !== orderItemIds.length) {
      throw new BadRequestException(
        'Duplicate order items are not allowed in a return request',
      );
    }
  }

  private async getReturnedQuantityMap(
    orderItemIds: string[],
  ): Promise<Map<string, number>> {
    if (orderItemIds.length === 0) {
      return new Map();
    }

    const returnedItems = await this.prisma.returnItem.groupBy({
      by: ['orderItemId'],

      where: {
        orderItemId: {
          in: orderItemIds,
        },

        returnRequest: {
          status: {
            in: [
              ReturnStatus.PENDING,
              ReturnStatus.APPROVED,
              ReturnStatus.RETURNED,
              ReturnStatus.REFUNDED,
            ],
          },
        },
      },

      _sum: {
        quantity: true,
      },
    });

    return new Map(
      returnedItems.map((item) => [item.orderItemId, item._sum.quantity ?? 0]),
    );
  }

  private validateReturnQuantity(params: ValidateReturnQuantityInput): void {
    const availableQuantity =
      params.purchasedQuantity - params.alreadyReturnedQuantity;

    if (params.requestedQuantity > availableQuantity) {
      throw new BadRequestException(
        'Return quantity exceeds available purchased quantity',
      );
    }
  }

  private async findOwnedReturnRequest(params: FindOwnedReturnRequestInput) {
    const returnRequest = await this.prisma.returnRequest.findFirst({
      where: {
        id: params.returnRequestId,
        userId: params.userId,
      },

      select: this.getReturnRequestSelect(),
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    return returnRequest;
  }

  private validateStatusTransition(
    currentStatus: ReturnStatus,
    newStatus: ReturnStatus,
  ): void {
    const allowedTransitions: Partial<Record<ReturnStatus, ReturnStatus[]>> = {
      [ReturnStatus.PENDING]: [ReturnStatus.APPROVED, ReturnStatus.REJECTED],

      [ReturnStatus.APPROVED]: [ReturnStatus.RETURNED],
    };

    const allowedStatuses = allowedTransitions[currentStatus] ?? [];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Return request cannot be changed from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private getReturnRequestSelect() {
    return {
      id: true,
      orderId: true,
      status: true,
      adminNote: true,

      createdAt: true,
      updatedAt: true,

      items: {
        select: {
          id: true,
          orderItemId: true,
          quantity: true,
          reason: true,
          comment: true,

          orderItem: {
            select: {
              productId: true,
              productName: true,
              productSku: true,
              price: true,
              quantity: true,
              total: true,
            },
          },
        },
      },
    };
  }

  private getAdminReturnRequestSelect() {
    return {
      id: true,
      userId: true,
      orderId: true,

      status: true,
      adminNote: true,

      createdAt: true,
      updatedAt: true,

      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      items: {
        select: {
          id: true,
          orderItemId: true,
          quantity: true,
          reason: true,
          comment: true,

          orderItem: {
            select: {
              productId: true,
              productName: true,
              productSku: true,
              price: true,
              quantity: true,
              total: true,
            },
          },
        },
      },
    };
  }
}
