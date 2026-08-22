import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { JazzcashService } from './jazzcash/jazzcash.service';
import { JazzCashCallback } from './jazzcash/jazzcash.types';
import { ConfigService } from '@nestjs/config';
import { updateProductStock } from 'src/products/helpers/product-stock.helper';
import { SafepayService } from './safepay/safepay.service';
import { RefundPaymentInput } from './types/payements.types';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jazzcashService: JazzcashService,
    private readonly configService: ConfigService,
    private readonly safepayService: SafepayService,
  ) {}

  // async initiateOnlinePayment(userId: string, paymentId: string) {
  //   const payment = await this.prisma.payment.findUnique({
  //     where: {
  //       id: paymentId,
  //       userId,
  //     },

  //     select: {
  //       id: true,
  //       orderId: true,
  //       method: true,
  //       status: true,
  //       amount: true,

  //       order: {
  //         select: {
  //           status: true,
  //           total: true,
  //         },
  //       },
  //     },
  //   });

  //   if (!payment) {
  //     throw new NotFoundException('Payment not found');
  //   }

  //   if (payment.method !== PaymentMethod.ONLINE) {
  //     throw new BadRequestException('This payment is not an online payment');
  //   }

  //   if (payment.status === PaymentStatus.PAID) {
  //     throw new BadRequestException('Payment has already been completed');
  //   }

  //   if (payment.status !== PaymentStatus.PENDING) {
  //     throw new BadRequestException(
  //       `Payment cannot be initiated while status is ${payment.status}`,
  //     );
  //   }

  //   if (payment.order.status !== OrderStatus.PENDING_PAYMENT) {
  //     throw new BadRequestException('Order is not waiting for online payment');
  //   }

  //   if (payment.amount !== payment.order.total) {
  //     throw new BadRequestException(
  //       'Payment amount does not match order total',
  //     );
  //   }

  //   return this.jazzcashService.createPaymentRequest({
  //     paymentId: payment.id,
  //     orderId: payment.orderId,
  //     amount: payment.amount,
  //   });
  // }

  async initiateOnlinePayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        id: paymentId,
        userId,
      },

      select: {
        id: true,
        orderId: true,
        method: true,
        provider: true,
        status: true,
        amount: true,

        order: {
          select: {
            status: true,
            total: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.method !== PaymentMethod.ONLINE) {
      throw new BadRequestException('This payment is not an online payment');
    }

    if (!payment.provider) {
      throw new BadRequestException('Payment provider is required');
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Payment has already been completed');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Payment cannot be initiated while status is ${payment.status}`,
      );
    }

    if (payment.order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Payment cannot be initiated for an order with status ${payment.order.status}`,
      );
    }

    if (payment.amount !== payment.order.total) {
      throw new BadRequestException(
        'Payment amount does not match order total',
      );
    }

    switch (payment.provider) {
      case PaymentProvider.JAZZCASH:
        return this.jazzcashService.createJazzCashPaymentRequest({
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
        });

      case PaymentProvider.SAFEPAY:
        return this.safepayService.createSafepayPaymentRequest({
          orderId: payment.orderId,
          amount: payment.amount,
        });

      default:
        throw new BadRequestException('Unsupported payment provider');
    }
  }

  async findMyPayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        id: paymentId,
        userId,
      },

      select: {
        id: true,
        orderId: true,
        method: true,
        status: true,
        amount: true,
        provider: true,
        transactionId: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,

        order: {
          select: {
            id: true,
            status: true,
            total: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async findPaymentByOrder(userId: string, orderId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId,
        userId,
      },

      select: {
        id: true,
        orderId: true,
        method: true,
        status: true,
        amount: true,
        provider: true,
        transactionId: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async markOnlinePaymentSucceeded(
    paymentId: string,
    provider: PaymentProvider,
    transactionId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findUnique({
          where: {
            id: paymentId,
          },
          select: {
            id: true,
            orderId: true,
            method: true,
            provider: true,
            status: true,

            order: {
              select: {
                status: true,
              },
            },
          },
        });

        if (!payment) {
          throw new NotFoundException('Payment not found');
        }

        if (payment.method !== PaymentMethod.ONLINE) {
          throw new BadRequestException('Payment is not an online payment');
        }

        if (payment.provider !== provider) {
          throw new BadRequestException('Payment provider does not match');
        }

        if (payment.status === PaymentStatus.PAID) {
          return {
            payment: {
              id: payment.id,
              orderId: payment.orderId,
              method: payment.method,
              provider: payment.provider,
              status: payment.status,
            },
            orderId: payment.orderId,
          };
        }

        if (payment.status !== PaymentStatus.PENDING) {
          throw new BadRequestException(
            `Payment cannot be completed while status is ${payment.status}`,
          );
        }

        if (payment.order.status !== OrderStatus.PENDING_PAYMENT) {
          throw new BadRequestException(
            `Order cannot be confirmed while status is ${payment.order.status}`,
          );
        }

        const updatedPayment = await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: PaymentStatus.PAID,
            transactionId,
            paidAt: new Date(),
          },
          select: {
            id: true,
            orderId: true,
            method: true,
            provider: true,
            status: true,
          },
        });

        await tx.order.update({
          where: {
            id: payment.orderId,
          },
          data: {
            status: OrderStatus.CONFIRMED,
          },
        });

        return {
          payment: updatedPayment,
          orderId: payment.orderId,
        };
      },
      {
        maxWait: 10000,
        timeout: 10000,
      },
    );
  }

  async markOnlinePaymentFailed(paymentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: {
          id: paymentId,
        },

        select: {
          id: true,
          orderId: true,
          method: true,
          status: true,

          order: {
            select: {
              status: true,

              items: {
                select: {
                  productId: true,
                  productName: true,
                  quantity: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.method !== PaymentMethod.ONLINE) {
        throw new BadRequestException('Payment is not an online payment');
      }

      if (payment.status === PaymentStatus.FAILED) {
        return {
          paymentId: payment.id,
          orderId: payment.orderId,
        };
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException(
          `Payment cannot be failed while status is ${payment.status}`,
        );
      }

      if (payment.order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException(
          `Order cannot be cancelled while status is ${payment.order.status}`,
        );
      }

      await tx.payment.update({
        where: {
          id: payment.id,
        },

        data: {
          status: PaymentStatus.FAILED,
        },
      });

      await tx.order.update({
        where: {
          id: payment.orderId,
        },

        data: {
          status: OrderStatus.CANCELLED,
        },
      });

      await updateProductStock(tx, payment.order.items, 'increment');

      return {
        paymentId: payment.id,
        orderId: payment.orderId,
      };
    });
  }

  async findAllForAdmin() {
    return this.prisma.payment.findMany({
      select: {
        id: true,
        orderId: true,
        userId: true,
        method: true,
        status: true,
        amount: true,
        provider: true,
        transactionId: true,
        paidAt: true,
        createdAt: true,

        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        order: {
          select: {
            id: true,
            status: true,
            total: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  //   async handleJazzCashCallback(
  //   body: JazzCashCallback,
  // ) {
  //   const result =
  //     this.jazzcashService.verifyCallback(body);

  //   if (!result.successful) {
  //     throw new BadRequestException(
  //       result.responseMessage ??
  //         'Online payment was not successful',
  //     );
  //   }

  //   const transactionId =
  //     result.providerTransactionId ??
  //     result.txnRefNo;

  //   if (!transactionId) {
  //     throw new BadRequestException(
  //       'JazzCash transaction ID is missing',
  //     );
  //   }

  //   const paymentResult =
  //     await this.markOnlinePaymentSucceeded(
  //       result.paymentId,
  //       'JAZZCASH',
  //       transactionId,
  //     );

  //   const order = await this.prisma.order.findUnique({
  //     where: {
  //       id: paymentResult.orderId,
  //     },

  //     select: {
  //       id: true,
  //       status: true,
  //       subtotal: true,
  //       deliveryFee: true,
  //       total: true,

  //       fullName: true,
  //       phone: true,
  //       address: true,
  //       city: true,
  //       note: true,

  //       createdAt: true,

  //       items: {
  //         select: {
  //           id: true,
  //           productId: true,
  //           productName: true,
  //           productSku: true,
  //           price: true,
  //           quantity: true,
  //           total: true,
  //         },
  //       },
  //     },
  //   });

  //   if (!order) {
  //     throw new NotFoundException(
  //       'Order not found',
  //     );
  //   }

  //   return order;
  // }

  async handleJazzCashCallback(body: JazzCashCallback) {
    const result = this.jazzcashService.verifyCallback(body);

    const clientUrl = this.configService.getOrThrow<string>('CLIENT_URL');

    if (!result.successful) {
      const failedPayment = await this.markOnlinePaymentFailed(
        result.paymentId,
      );

      return {
        redirectUrl: `${clientUrl}/orders/${failedPayment.orderId}/payment-failed`,
      };
    }

    const transactionId = result.providerTransactionId ?? result.txnRefNo;

    if (!transactionId) {
      throw new BadRequestException('JazzCash transaction ID is missing');
    }

    const paymentResult = await this.markOnlinePaymentSucceeded(
      result.paymentId,
      'JAZZCASH',
      transactionId,
    );

    return {
      redirectUrl: `${clientUrl}/orders/${paymentResult.orderId}/success`,
    };
  }

  async createRefundRequest(params: RefundPaymentInput) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        id: params.paymentId,
      },

      select: {
        id: true,
        orderId: true,
        method: true,
        provider: true,
        status: true,
        amount: true,
        transactionId: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.method !== PaymentMethod.ONLINE) {
      throw new BadRequestException(
        'Only online payments can be refunded through a payment provider',
      );
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Only paid payments can be refunded');
    }

    if (!payment.provider) {
      throw new BadRequestException('Payment provider not found');
    }

    switch (payment.provider) {
      case PaymentProvider.SAFEPAY:
        return this.safepayService.refundPaymentRequestForSafePay({
          paymentId: payment.id,
          transactionId: payment.transactionId,
          amount: payment.amount,
        });

      case PaymentProvider.JAZZCASH:
        // return this.jazzcashService.refundPaymentRequestForJazzCash({
        //   paymentId: payment.id,
        //   transactionId: payment.transactionId,
        //   amount: payment.amount,
        // });

      default:
        throw new BadRequestException('Unsupported payment provider');
    }
  }
}
